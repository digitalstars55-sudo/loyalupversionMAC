"""
Мобильные API маршруты. Подключаются из main/urls.py с префиксом 'api/v1/'.
"""

from django.urls import path

from .views import (
    MobileBranchListAPIView,
    MobileReviewListAPIView,
    MobileReviewMessagesAPIView,
    MobileReviewReplyAPIView,
    MobileReviewResolveAPIView,
)

urlpatterns = [
    # Branches
    path(
        'mobile/branches/',
        MobileBranchListAPIView.as_view(),
        name='mobile-branch-list',
    ),

    # Reviews
    path(
        'mobile/reviews/',
        MobileReviewListAPIView.as_view(),
        name='mobile-review-list',
    ),
    path(
        'mobile/reviews/<int:review_id>/messages/',
        MobileReviewMessagesAPIView.as_view(),
        name='mobile-review-messages',
    ),
    path(
        'mobile/reviews/<int:review_id>/reply/',
        MobileReviewReplyAPIView.as_view(),
        name='mobile-review-reply',
    ),
    path(
        'mobile/reviews/<int:review_id>/resolve/',
        MobileReviewResolveAPIView.as_view(),
        name='mobile-review-resolve',
    ),
]
