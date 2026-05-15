"""
Мобильное API: list + reply для отзывов. Read+create only — не правит
ничего, кроме создания TestimonialMessage(source=ADMIN_REPLY) и flag'ов
`is_replied/has_unread` на TestimonialConversation.

Эти view не пересекаются с веб-views в analytics. Веб продолжает работать.
"""

from __future__ import annotations

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tenant.branch.models import (
    Branch,
    TestimonialConversation,
    TestimonialMessage,
)

from .serializers import (
    BranchSerializer,
    ReviewListSerializer,
    ReviewMessageSerializer,
    ReviewReplySerializer,
)


# ════════════════════════════════════════════════════════════════════
# Branches — мобайл-friendly список точек
# ════════════════════════════════════════════════════════════════════
class MobileBranchListAPIView(generics.ListAPIView):
    """GET /api/v1/mobile/branches/"""
    permission_classes = [IsAuthenticated]
    serializer_class = BranchSerializer

    def get_queryset(self):
        return Branch.objects.select_related('config').filter(is_active=True).order_by('name')


# ════════════════════════════════════════════════════════════════════
# Reviews
# ════════════════════════════════════════════════════════════════════
class MobileReviewListAPIView(generics.ListAPIView):
    """
    GET /api/v1/mobile/reviews/?branch_ids=1,2&period=30

    Возвращает список TestimonialConversation в формате `Review[]`
    как ожидает мобайл. period — целое число дней (фильтр по
    last_message_at).
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ReviewListSerializer

    def get_queryset(self):
        qs = TestimonialConversation.objects.select_related(
            'branch', 'client__client', 'vk_guest',
        ).prefetch_related('messages').order_by('-last_message_at', '-id')

        # Фильтр по точкам
        branch_ids_raw = self.request.query_params.get('branch_ids')
        if branch_ids_raw:
            try:
                branch_ids = [int(x) for x in branch_ids_raw.split(',') if x.strip().isdigit()]
                if branch_ids:
                    qs = qs.filter(branch_id__in=branch_ids)
            except ValueError:
                pass

        # Фильтр по периоду
        period_raw = self.request.query_params.get('period')
        if period_raw:
            try:
                days = int(period_raw)
                if days > 0:
                    since = timezone.now() - timezone.timedelta(days=days)
                    qs = qs.filter(last_message_at__gte=since)
            except (ValueError, TypeError):
                pass

        return qs

    def list(self, request, *args, **kwargs):
        # Мобайл ожидает {reviews: [...]} а не голый массив
        qs = self.filter_queryset(self.get_queryset())
        ser = self.get_serializer(qs, many=True)
        return Response({'reviews': ser.data})


class MobileReviewMessagesAPIView(generics.ListAPIView):
    """GET /api/v1/mobile/reviews/{id}/messages/"""
    permission_classes = [IsAuthenticated]
    serializer_class = ReviewMessageSerializer

    def get_queryset(self):
        review_id = self.kwargs['review_id']
        return TestimonialMessage.objects.filter(
            conversation_id=review_id,
        ).order_by('created_at')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        ser = self.get_serializer(qs, many=True)
        return Response({'messages': ser.data})


class MobileReviewReplyAPIView(APIView):
    """
    POST /api/v1/mobile/reviews/{review_id}/reply/  body: {text}

    Создаёт TestimonialMessage(source=ADMIN_REPLY) и обновляет
    conversation.is_replied=True, has_unread=False.
    Не отправляет сообщение во внешний VK — это делает существующая
    Celery-задача после сохранения (если такая есть в проекте).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, review_id: int):
        ser = ReviewReplySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        text = ser.validated_data['text'].strip()

        conv = get_object_or_404(TestimonialConversation, pk=review_id)
        with transaction.atomic():
            msg = TestimonialMessage.objects.create(
                conversation=conv,
                source=TestimonialMessage.Source.ADMIN_REPLY,
                text=text,
            )
            conv.is_replied = True
            conv.has_unread = False
            conv.last_message_at = msg.created_at
            conv.save(update_fields=['is_replied', 'has_unread', 'last_message_at'])

        return Response(ReviewMessageSerializer(msg).data, status=status.HTTP_201_CREATED)


class MobileReviewResolveAPIView(APIView):
    """
    POST /api/v1/mobile/reviews/{review_id}/resolve/

    Помечает обращение как прочитанное (has_unread=False).
    Сообщение в VK не отправляется. Не разрешено для негативных VK-отзывов
    без ответа — мобайл это валидирует, дублирование тут.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, review_id: int):
        conv = get_object_or_404(TestimonialConversation, pk=review_id)
        # Защита: для VK-негатива без ответа не разрешаем закрывать без reply
        is_vk = not conv.messages.filter(source=TestimonialMessage.Source.APP).exists()
        if is_vk and conv.sentiment in ('NEGATIVE', 'PARTIALLY_NEGATIVE') and not conv.is_replied:
            return Response(
                {'detail': 'Нельзя закрыть негативный VK-отзыв без ответа гостю.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        conv.has_unread = False
        conv.save(update_fields=['has_unread'])
        return Response({'ok': True})
