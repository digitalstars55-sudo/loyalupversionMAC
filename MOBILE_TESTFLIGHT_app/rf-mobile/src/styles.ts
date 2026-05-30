import { StyleSheet } from 'react-native';
import { C, F, SHADOW_CARD, SHADOW_HERO, SHADOW_FAB, SHADOW_MODAL } from './theme';
import type { Resp } from './responsive';

// ════════════════════════════════════════════════════════════════════
// STYLES — все стили приложения, responsive через makeStyles(r)
// ════════════════════════════════════════════════════════════════════

export function makeStyles(r: Resp) {
  const { pad, scale, isTiny, isSmall, isTablet } = r;

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.paper },
    center: { justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontFamily: F.semibold, color: C.ink3, marginTop: 12, fontSize: 13 },

    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 110 },

    header: {
      paddingHorizontal: pad, paddingTop: 8, paddingBottom: 18,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    },
    iconBtn: {
      width: 40, height: 40, borderRadius: 11, overflow: 'hidden',
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
      alignItems: 'center', justifyContent: 'center',
    },
    titleBlock: { flex: 1, alignItems: 'center' },
    titleSuper: {
      fontFamily: F.bold, fontSize: 10, letterSpacing: 2.5,
      color: C.purple, textTransform: 'uppercase', marginBottom: 3,
    },
    titleMain: { fontFamily: F.extrabold, fontSize: scale(17), color: C.ink, letterSpacing: -0.4 },

    hero: {
      marginHorizontal: pad, marginBottom: 22, padding: isTiny ? 18 : 22,
      backgroundColor: C.surface, borderRadius: 20,
      borderWidth: 1, borderColor: C.line,
      position: 'relative', overflow: 'hidden', ...SHADOW_CARD,
    },
    heroAccent: {
      position: 'absolute', top: 0, left: isTiny ? 18 : 22, width: 42, height: 3,
      backgroundColor: C.purple,
      borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
    },
    heroRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 4, marginBottom: 12, gap: 10,
    },
    heroLabel: { fontFamily: F.bold, fontSize: 10, letterSpacing: 2.4, color: C.ink3, flexShrink: 1 },
    heroPeriod: { fontFamily: F.semibold, fontSize: 11, color: C.ink3 },
    heroPeriodB: { fontFamily: F.bold, color: C.ink2 },
    heroStat: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' },
    heroNum: {
      fontFamily: F.extrabold,
      fontSize: scale(54),
      lineHeight: scale(66),
      color: C.ink, letterSpacing: -2,
    },
    heroLbl: {
      fontFamily: F.bold, fontSize: 11, color: C.ink3,
      paddingBottom: 8, lineHeight: 16, letterSpacing: 1.6,
      textTransform: 'uppercase', maxWidth: 110,
    },
    heroTrend: {
      marginTop: 14, paddingTop: 14,
      borderTopWidth: 1, borderTopColor: C.lineSoft,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    heroPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 50, backgroundColor: C.lime,
    },
    heroPillText: { fontFamily: F.extrabold, fontSize: 11, color: C.ink },
    heroTrendText: { fontFamily: F.semibold, fontSize: 12, color: C.ink3 },

    filterBlock: { paddingHorizontal: pad, marginBottom: 18 },
    filterLabel: {
      fontFamily: F.bold, fontSize: 10, letterSpacing: 2.8,
      color: C.ink3, textTransform: 'uppercase',
      marginBottom: 10, paddingHorizontal: 2,
    },
    chipsRow: { flexDirection: 'row', gap: 7, paddingRight: pad },
    chip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, overflow: 'hidden',
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    },
    chipActive: { backgroundColor: C.purple, borderColor: C.purple },
    chipText: { fontFamily: F.semibold, fontSize: 13, color: C.ink2 },
    chipTextActive: { fontFamily: F.bold, color: C.surface },

    segmented: {
      marginTop: 12, backgroundColor: C.surface,
      borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 3,
      flexDirection: 'row',
    },
    seg: {
      flex: 1, paddingVertical: 10, overflow: 'hidden',
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
      borderRadius: 9,
    },
    segActive: { backgroundColor: C.purple },
    segText: { fontFamily: F.bold, fontSize: 13, color: C.ink3 },
    segTextActive: { color: C.surface },

    thresholds: {
      marginHorizontal: pad, marginBottom: 22,
      paddingVertical: 14, paddingHorizontal: 16, overflow: 'hidden',
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14,
      flexDirection: 'row', alignItems: 'center', gap: 14, ...SHADOW_CARD,
    },
    thIcon: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: C.lime,
      alignItems: 'center', justifyContent: 'center',
    },
    thText: { flex: 1 },
    thTitle: {
      fontFamily: F.bold, fontSize: 10, color: C.ink3,
      letterSpacing: 2.2, textTransform: 'uppercase', marginBottom: 5,
    },
    thValRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2 },
    thVal: { fontFamily: F.semibold, fontSize: 13, color: C.ink, lineHeight: 20 },
    thCode: {
      fontFamily: F.bold, fontSize: 12.5,
      color: C.purpleDeep, backgroundColor: C.purpleSoft,
      paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, overflow: 'hidden',
    },

    kpiGrid: { paddingHorizontal: pad, marginBottom: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    kpi: {
      width: r.kpiCols === 1 ? '100%' : r.kpiCols === 4 ? '23.5%' : '48%',
      flexGrow: 1,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14,
      paddingHorizontal: 14, paddingTop: 16, paddingBottom: 14,
      position: 'relative', overflow: 'hidden', ...SHADOW_CARD,
    },
    kpiAccent: {
      position: 'absolute', top: 0, left: 14, width: 24, height: 3,
      borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
    },
    kpiTrend: {
      position: 'absolute', top: 14, right: 14,
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 50,
    },
    kpiTrendUp: { backgroundColor: C.goodSoft },
    kpiTrendDown: { backgroundColor: C.warnSoft },
    kpiTrendText: { fontFamily: F.bold, fontSize: 11 },
    kpiLabel: {
      fontFamily: F.bold, fontSize: 10, color: C.ink3,
      letterSpacing: 2, textTransform: 'uppercase', marginTop: 6,
    },
    kpiVal: { fontFamily: F.extrabold, fontSize: scale(26), lineHeight: scale(38), marginTop: 6, letterSpacing: -0.5 },
    kpiSub: { fontFamily: F.medium, fontSize: 11, color: C.ink3, marginTop: 5, lineHeight: 15 },

    secHead: {
      paddingHorizontal: pad, marginBottom: 12,
      flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    },
    secTitle: { fontFamily: F.extrabold, fontSize: scale(17), color: C.ink, letterSpacing: -0.3 },
    secMeta: {
      fontFamily: F.bold, fontSize: 10, color: C.ink3,
      letterSpacing: 2.2, textTransform: 'uppercase',
    },

    bentoHead: {
      paddingHorizontal: pad, marginBottom: 12,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    },
    bentoHeadTitle: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flex: 1 },
    bentoHeadActions: { flexDirection: 'row', gap: 8 },
    headIconBtn: {
      width: 34, height: 34, borderRadius: 10, overflow: 'hidden',
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
      alignItems: 'center', justifyContent: 'center',
    },

    filterChipsScroll: { marginBottom: 14 },
    filterChipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: pad, paddingRight: pad + 4 },
    filterChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 50, overflow: 'hidden',
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    },
    filterChipActive: { backgroundColor: C.ink, borderColor: C.ink },
    filterChipText: { fontFamily: F.bold, fontSize: 12.5, color: C.ink2 },
    filterChipTextActive: { color: C.surface },
    filterChipBadge: {
      backgroundColor: C.paper, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 50,
      borderWidth: 1, borderColor: C.line,
    },
    filterChipBadgeActive: { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'transparent' },
    filterChipBadgeText: { fontFamily: F.extrabold, fontSize: 10, color: C.ink3 },
    filterChipBadgeTextActive: { color: C.surface },

    bentoWrap: { paddingHorizontal: pad, marginBottom: 22 },
    bentoEmpty: {
      paddingHorizontal: pad, paddingVertical: 30, alignItems: 'center',
    },
    bentoEmptyText: { fontFamily: F.semibold, fontSize: 13, color: C.ink3 },

    bentoHero: {
      backgroundColor: C.surface, borderRadius: 18,
      borderWidth: 1, borderColor: C.line,
      paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, marginBottom: 10,
      position: 'relative', overflow: 'hidden', ...SHADOW_HERO,
    },
    bentoHeroSelected: { borderColor: C.purple, borderWidth: 1.5, backgroundColor: C.purpleSoft },
    bentoHeroEdge: {
      position: 'absolute', top: 0, left: 18, width: 56, height: 4,
      borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
    },
    bentoHeroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginTop: 6 },
    bentoEmoji: { fontSize: 38, lineHeight: 42 },
    bentoHeroTopText: { flex: 1 },
    bentoHeroName: {
      fontFamily: F.extrabold, fontSize: scale(24), color: C.ink,
      letterSpacing: -0.6, lineHeight: scale(28),
    },
    bentoCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
    bentoCodePill: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50,
      backgroundColor: C.purpleSoft,
    },
    bentoCodeText: {
      fontFamily: F.extrabold, fontSize: 10, color: C.purpleDeep,
      letterSpacing: 1.4, textTransform: 'uppercase',
    },
    bentoDeltaPill: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 50,
    },
    bentoDeltaUp: { backgroundColor: C.goodSoft },
    bentoDeltaDown: { backgroundColor: C.warnSoft },
    bentoDeltaText: { fontFamily: F.extrabold, fontSize: 10.5 },

    bentoHeroStats: {
      flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12,
      marginTop: 14,
    },
    bentoHeroCount: {
      fontFamily: F.extrabold, fontSize: scale(40), color: C.ink,
      letterSpacing: -1.4, lineHeight: scale(40),
    },
    bentoHeroSub: {
      fontFamily: F.bold, fontSize: 11, color: C.ink3, marginTop: 4,
      letterSpacing: 0.5,
    },
    bentoHeroBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, overflow: 'hidden',
      backgroundColor: C.purple,
    },
    bentoHeroBtnText: { fontFamily: F.bold, fontSize: 13, color: C.surface },

    bentoMediumRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    bentoMed: {
      flex: 1, minWidth: 0,
      backgroundColor: C.surface, borderRadius: 14,
      borderWidth: 1, borderColor: C.line,
      paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10,
      position: 'relative', overflow: 'hidden', ...SHADOW_CARD,
    },
    bentoMedSelected: { borderColor: C.purple, borderWidth: 1.5, backgroundColor: C.purpleSoft },
    bentoMedEdge: {
      position: 'absolute', top: 0, left: 12, width: 32, height: 3,
      borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
    },
    bentoMedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    bentoEmojiMed: { fontSize: 24, lineHeight: 28 },
    bentoMedName: {
      fontFamily: F.extrabold, fontSize: scale(15), color: C.ink,
      letterSpacing: -0.3, marginTop: 8,
    },
    bentoMedCode: {
      fontFamily: F.bold, fontSize: 9.5, color: C.ink3,
      letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2,
    },
    bentoMedCount: {
      fontFamily: F.extrabold, fontSize: scale(22), color: C.ink,
      letterSpacing: -0.6, marginTop: 8, lineHeight: scale(22),
    },
    bentoMedSub: { fontFamily: F.semibold, fontSize: 11, color: C.ink3, marginTop: 2 },
    bentoMedBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
      paddingVertical: 8, borderRadius: 9, overflow: 'hidden',
      backgroundColor: C.purpleSoft, borderWidth: 1, borderColor: C.purpleLine,
      marginTop: 10,
    },
    bentoMedBtnText: { fontFamily: F.bold, fontSize: 11.5, color: C.purpleDeep },

    bentoCompactScroll: { marginTop: 0 },
    bentoCompactRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
    bentoCmp: {
      width: 130,
      backgroundColor: C.surface, borderRadius: 12,
      borderWidth: 1, borderColor: C.line,
      paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10,
      position: 'relative', overflow: 'hidden', ...SHADOW_CARD,
    },
    bentoCmpSelected: { borderColor: C.purple, borderWidth: 1.5, backgroundColor: C.purpleSoft },
    bentoCmpEdge: {
      position: 'absolute', top: 0, left: 10, width: 22, height: 2,
      borderBottomLeftRadius: 2, borderBottomRightRadius: 2,
    },
    bentoCmpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
    bentoEmojiCmp: { fontSize: 20, lineHeight: 22 },
    bentoCmpName: { fontFamily: F.bold, fontSize: 12, color: C.ink, marginTop: 8 },
    bentoCmpCount: {
      fontFamily: F.extrabold, fontSize: scale(18), color: C.ink,
      letterSpacing: -0.4, marginTop: 4, lineHeight: scale(20),
    },

    matrixCard: {
      marginHorizontal: pad, marginBottom: 22,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16,
      paddingHorizontal: isTiny ? 8 : 12, paddingTop: 14, paddingBottom: 12, ...SHADOW_CARD,
    },
    matrixRow: { flexDirection: 'row', gap: isTiny ? 4 : 5, marginBottom: isTiny ? 4 : 5 },
    axisCorner: { width: isTiny ? 24 : 28, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, paddingBottom: 8 },
    axisCornerText: { fontFamily: F.bold, fontSize: 10, color: C.ink4, letterSpacing: 0.5 },
    fHeader: { flex: 1, alignItems: 'center', paddingTop: 4, paddingBottom: 8, paddingHorizontal: 2 },
    rHeader: { width: isTiny ? 24 : 28, alignItems: 'center', justifyContent: 'center', gap: 4 },
    mhLbl: { fontFamily: F.extrabold, fontSize: scale(14), color: C.ink, letterSpacing: -0.2 },
    mhNm: {
      fontFamily: F.bold, fontSize: 9, color: C.ink3,
      marginTop: 2, letterSpacing: 1.4, textTransform: 'uppercase',
    },
    mhRng: { fontFamily: F.semibold, fontSize: 9, color: C.ink3, marginTop: 1 },

    cell: {
      flex: 1, minHeight: isTiny ? 78 : isSmall ? 84 : isTablet ? 110 : 92,
      borderRadius: 11, overflow: 'hidden',
      paddingHorizontal: 4, paddingVertical: 8,
      borderWidth: 1, borderColor: C.line,
      backgroundColor: C.surface,
      alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    },
    cellSelected: {
      borderColor: C.purple, borderWidth: 1.5, backgroundColor: C.purpleSoft,
    },
    cellEdge: { position: 'absolute', left: 0, top: 18, bottom: 18, width: 2 },
    cellEmoji: { fontSize: 22, lineHeight: 26 },
    cellCt: {
      fontFamily: F.extrabold, fontSize: scale(20), color: C.ink,
      marginTop: 2, letterSpacing: -0.5, lineHeight: scale(22),
    },
    cellPc: { fontFamily: F.bold, fontSize: 10, color: C.ink3, marginTop: 1 },

    detail: {
      marginHorizontal: pad, marginBottom: 22,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16,
      padding: isTiny ? 16 : 20, ...SHADOW_CARD,
    },
    detailEyebrow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      alignSelf: 'flex-start',
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 50,
      backgroundColor: C.purpleSoft, marginBottom: 12,
    },
    detailEmoji: { fontSize: 16, lineHeight: 18 },
    detailEyebrowText: {
      fontFamily: F.extrabold, fontSize: 10,
      color: C.purpleDeep, letterSpacing: 1.8, textTransform: 'uppercase',
    },
    detailName: {
      fontFamily: F.extrabold, fontSize: scale(26), color: C.ink,
      lineHeight: scale(30), letterSpacing: -0.7,
    },
    detailSub: { marginTop: 8, fontFamily: F.medium, fontSize: 13, color: C.ink2, lineHeight: 19 },

    detailStats: {
      flexDirection: 'row', marginTop: 18,
      borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.lineSoft,
    },
    ds: { flex: 1, paddingVertical: 14, paddingHorizontal: 4 },
    dsLeft: { borderRightWidth: 1, borderColor: C.lineSoft, paddingRight: 14 },
    dsRight: { paddingLeft: 14 },
    dsVal: {
      fontFamily: F.extrabold, fontSize: scale(26), color: C.ink,
      lineHeight: scale(36), letterSpacing: -0.6,
    },
    dsLbl: {
      fontFamily: F.bold, fontSize: 10, color: C.ink3, marginTop: 6,
      letterSpacing: 2.2, textTransform: 'uppercase',
    },

    advice: {
      marginTop: 14,
      backgroundColor: C.hintBg, borderRadius: 12,
      borderWidth: 1, borderColor: C.hintLine,
      paddingHorizontal: 14, paddingVertical: 12,
    },
    adviceBlock: {},
    adviceHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
    adviceTitle: {
      fontFamily: F.extrabold, fontSize: 10,
      letterSpacing: 2.2, textTransform: 'uppercase',
    },
    adviceText: { fontFamily: F.medium, fontSize: 13, color: C.ink2, lineHeight: 19 },
    adviceDivider: { height: 1, backgroundColor: C.hintLine, marginVertical: 12, marginHorizontal: -14 },
    adviceDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.limeDeep },

    actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
    actionsStack: { flexDirection: 'column' },
    btn: {
      flex: 1, paddingVertical: 13, paddingHorizontal: 12, overflow: 'hidden',
      borderRadius: 12, borderWidth: 1,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    },
    btnPrimary: { backgroundColor: C.purple, borderColor: C.purple },
    btnPrimaryText: { fontFamily: F.bold, fontSize: 13, color: C.surface },
    btnSecondary: { backgroundColor: C.surface, borderColor: C.line },
    btnSecondaryText: { fontFamily: F.bold, fontSize: 13, color: C.ink },
    btnAi: { backgroundColor: C.purpleSoft, borderColor: C.purpleLine },
    btnAiText: { fontFamily: F.bold, fontSize: 13, color: C.purpleDeep },
    btnDanger: { backgroundColor: C.warnSoft, borderColor: '#FCA5A5' },
    btnDangerText: { fontFamily: F.bold, fontSize: 13, color: C.warn },

    migrations: {
      marginHorizontal: pad, marginBottom: 24,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14,
      paddingHorizontal: 14, ...SHADOW_CARD,
    },
    migRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 13,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    migRowLast: { borderBottomWidth: 0 },
    migFrom: { fontFamily: F.semibold, fontSize: 13, color: C.ink3, flexShrink: 1 },
    migArrow: { fontFamily: F.bold, fontSize: 14, color: C.ink4 },
    migTo: { fontFamily: F.bold, fontSize: 13, color: C.ink, flexShrink: 1 },
    migCount: { marginLeft: 'auto', paddingHorizontal: 9, paddingVertical: 2, borderRadius: 50 },
    migCountPos: { backgroundColor: C.goodSoft },
    migCountNeg: { backgroundColor: C.warnSoft },
    migCountText: { fontFamily: F.extrabold, fontSize: 13 },
    migCountTextPos: { color: C.good },
    migCountTextNeg: { color: C.warn },

    fab: {
      position: 'absolute', right: pad, bottom: r.fabBottom + 30,
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: C.purple,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: C.purple, shadowOpacity: 0.7, shadowRadius: 20,
      shadowOffset: { width: 0, height: 0 }, elevation: 10,
      zIndex: 40,
    },

    tabbar: {
      position: 'absolute', left: 12, right: 12, bottom: 24,
      paddingTop: 8, paddingBottom: 8, paddingHorizontal: 6,
      backgroundColor: C.surface,
      borderRadius: 28,
      flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', zIndex: 30,
      shadowColor: '#000',
      shadowOpacity: 0.10, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8,
    },
    tab: {
      flex: 1, paddingVertical: 8, paddingHorizontal: 4,
      alignItems: 'center', justifyContent: 'center', gap: 3, position: 'relative',
      borderRadius: 20,
    },
    tabActive: {
      backgroundColor: C.purpleSoft,
    },
    tabIndicator: {
      // больше не используется в новом дизайне; оставлено пустым на случай старого вызова
      width: 0, height: 0,
    },
    tabLabel: { fontFamily: F.bold, fontSize: 10, color: C.ink4, letterSpacing: 0.4 },
    tabLabelActive: { color: C.purple },
    tabBadge: {
      position: 'absolute', top: 4, right: '20%',
      backgroundColor: C.lime,
      minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: C.surface,
    },
    tabBadgeText: { fontFamily: F.extrabold, fontSize: 9, color: C.ink },

    modalRoot: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,24,27,0.5)' },
    modalSheet: {
      backgroundColor: C.surface,
      borderTopLeftRadius: 22, borderTopRightRadius: 22,
      maxHeight: '90%', paddingBottom: 20, ...SHADOW_MODAL,
    },
    modalSheetTall: { minHeight: '60%' },
    modalHandle: {
      alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
      backgroundColor: C.line, marginTop: 8, marginBottom: 4,
    },
    modalHeader: {
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    modalSuper: {
      fontFamily: F.bold, fontSize: 10, color: C.purple,
      letterSpacing: 2.2, textTransform: 'uppercase', marginBottom: 2,
    },
    modalTitle: { fontFamily: F.extrabold, fontSize: scale(18), color: C.ink, letterSpacing: -0.4 },
    modalClose: {
      width: 34, height: 34, borderRadius: 10, overflow: 'hidden',
      backgroundColor: C.paper, borderWidth: 1, borderColor: C.line,
      alignItems: 'center', justifyContent: 'center',
    },

    modalBody: { flexGrow: 0 },
    modalBodyContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },

    modalSegInfo: {
      flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
      paddingHorizontal: 12, paddingVertical: 10,
      backgroundColor: C.paper, borderRadius: 10,
      borderWidth: 1, borderColor: C.lineSoft,
    },
    modalSegBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50,
      backgroundColor: C.purpleSoft,
    },
    modalSegDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.purple },
    modalSegBadgeText: {
      fontFamily: F.extrabold, fontSize: 10, color: C.purpleDeep,
      letterSpacing: 1.4, textTransform: 'uppercase',
    },
    modalSegCount: { fontFamily: F.bold, fontSize: 12, color: C.ink3, marginLeft: 'auto' },

    modalHint: {
      marginBottom: 14,
      backgroundColor: C.hintBg, borderWidth: 1, borderColor: C.hintLine, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
    },
    modalHintHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    modalHintTitle: {
      fontFamily: F.extrabold, fontSize: 10, color: C.hintInk,
      letterSpacing: 1.8, textTransform: 'uppercase',
    },
    modalHintText: { fontFamily: F.medium, fontSize: 13, color: C.ink2, lineHeight: 18 },

    modalInputWrap: {
      backgroundColor: C.paper,
      borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 4,
    },
    modalTextarea: {
      minHeight: 110, maxHeight: 220,
      paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10,
      fontFamily: F.regular, fontSize: 14, color: C.ink, lineHeight: 20,
    },
    modalCharCount: {
      alignSelf: 'flex-end', marginTop: 6, marginBottom: 12,
      fontFamily: F.semibold, fontSize: 11, color: C.ink4,
    },
    modalCharCountOver: { color: C.warn, fontFamily: F.bold },

    modalImageDrop: {
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, borderRadius: 12,
      paddingVertical: 18, paddingHorizontal: 14, overflow: 'hidden',
      alignItems: 'center', justifyContent: 'center', gap: 4,
      backgroundColor: C.paper,
    },
    modalImageDropText: { fontFamily: F.bold, fontSize: 13, color: C.ink2, marginTop: 4 },
    modalImageDropHint: { fontFamily: F.medium, fontSize: 11, color: C.ink4 },
    modalImagePreview: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
    modalImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: C.line },
    modalImageRemove: {
      position: 'absolute', top: 8, right: 8,
      width: 28, height: 28, borderRadius: 14, overflow: 'hidden',
      backgroundColor: 'rgba(24,24,27,0.7)',
      alignItems: 'center', justifyContent: 'center',
    },

    modalStatus: {
      marginTop: 12, paddingHorizontal: 12, paddingVertical: 10,
      borderRadius: 10, borderWidth: 1,
    },
    modalStatusOk:  { backgroundColor: C.goodSoft, borderColor: '#A7F3C2' },
    modalStatusErr: { backgroundColor: C.warnSoft, borderColor: '#FCA5A5' },
    modalStatusLoad:{ backgroundColor: C.paper,    borderColor: C.line },
    modalStatusText: { fontFamily: F.semibold, fontSize: 13, lineHeight: 18 },

    senlerLink: {
      marginTop: 14, paddingVertical: 8,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      borderRadius: 8, overflow: 'hidden',
    },
    senlerLinkText: {
      fontFamily: F.semibold, fontSize: 12, color: C.ink3,
      textDecorationLine: 'underline',
    },

    modalFooter: {
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
      borderTopWidth: 1, borderTopColor: C.lineSoft,
      flexDirection: 'row', gap: 10,
    },

    guestCountChip: {
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50,
      backgroundColor: C.purpleSoft,
    },
    guestCountChipText: {
      fontFamily: F.extrabold, fontSize: 11, color: C.purpleDeep,
      letterSpacing: 0.4,
    },
    guestsEmpty: {
      paddingVertical: 50, alignItems: 'center', justifyContent: 'center', gap: 12,
    },
    guestsEmptyText: { fontFamily: F.semibold, fontSize: 13, color: C.ink3 },
    guestsListContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 },
    guestCard: {
      backgroundColor: C.paper, borderRadius: 12,
      borderWidth: 1, borderColor: C.line,
      padding: 12,
    },
    guestCardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    guestIdx: { width: 26, fontFamily: F.bold, fontSize: 11, color: C.ink4 },
    guestName: { fontFamily: F.extrabold, fontSize: 14, color: C.ink, letterSpacing: -0.2 },
    guestVk: { fontFamily: F.medium, fontSize: 11, color: C.ink4, marginTop: 1 },
    guestCoins: { alignItems: 'flex-end' },
    guestCoinsVal: { fontFamily: F.extrabold, fontSize: 16, color: C.purpleDeep, letterSpacing: -0.3 },
    guestCoinsLbl: { fontFamily: F.bold, fontSize: 9, color: C.ink4, letterSpacing: 1.4, textTransform: 'uppercase' },

    guestStats: {
      flexDirection: 'row', marginTop: 10, paddingTop: 10,
      borderTopWidth: 1, borderTopColor: C.lineSoft,
    },
    guestStat: { flex: 1, alignItems: 'center' },
    guestStatMid: {
      borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.lineSoft,
    },
    guestStatVal: { fontFamily: F.extrabold, fontSize: 14, color: C.ink },
    guestStatLbl: {
      fontFamily: F.bold, fontSize: 9, color: C.ink4, marginTop: 3,
      letterSpacing: 1.4, textTransform: 'uppercase',
    },

    legendRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, paddingVertical: 14,
      backgroundColor: C.paper, borderRadius: 12,
      borderWidth: 1, borderColor: C.line, overflow: 'hidden',
      marginBottom: 8, position: 'relative',
    },
    legendEdge: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 3, borderRadius: 2 },
    legendEmoji: { fontSize: 26, lineHeight: 30, marginLeft: 6 },
    legendName: { fontFamily: F.extrabold, fontSize: 15, color: C.ink, letterSpacing: -0.3 },
    legendCode: {
      fontFamily: F.bold, fontSize: 10, color: C.ink3,
      letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 2,
    },
    legendCount: { alignItems: 'flex-end', marginRight: 4 },
    legendCountVal: { fontFamily: F.extrabold, fontSize: 16, color: C.ink, letterSpacing: -0.3 },
    legendCountLbl: { fontFamily: F.bold, fontSize: 9, color: C.ink4, letterSpacing: 1.4, textTransform: 'uppercase' },
    legendFootnote: {
      fontFamily: F.medium, fontSize: 11, color: C.ink4,
      textAlign: 'center', marginTop: 12,
    },

    // ════════════════════════════════════════════════════════════════
    // SCREEN HEADER (общий для не-аналитических экранов)
    // ════════════════════════════════════════════════════════════════
    screenHeader: {
      paddingHorizontal: pad, paddingTop: 8, paddingBottom: 14,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    },
    screenTitleBlock: { flex: 1 },
    screenTitleSuper: {
      fontFamily: F.bold, fontSize: 10, letterSpacing: 2.5,
      color: C.purple, textTransform: 'uppercase', marginBottom: 3,
    },
    screenTitleMain: { fontFamily: F.extrabold, fontSize: scale(22), color: C.ink, letterSpacing: -0.6 },

    // ════════════════════════════════════════════════════════════════
    // REVIEWS — summary strip + cards
    // ════════════════════════════════════════════════════════════════
    rvSummary: {
      marginHorizontal: pad, marginBottom: 18, padding: 18,
      backgroundColor: C.surface, borderRadius: 18,
      borderWidth: 1, borderColor: C.line, ...SHADOW_CARD,
    },
    rvSummaryHeadRow: {
      flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
      marginBottom: 14,
    },
    rvSummaryNum: {
      fontFamily: F.extrabold, fontSize: scale(40), color: C.warn,
      letterSpacing: -1.4, lineHeight: scale(50),
    },
    rvSummaryLbl: {
      fontFamily: F.bold, fontSize: 11, color: C.ink3,
      paddingBottom: 6, lineHeight: 16, letterSpacing: 1.6,
      textTransform: 'uppercase', maxWidth: 110,
    },
    rvSummaryMeta: {
      fontFamily: F.semibold, fontSize: 11, color: C.ink3,
      marginBottom: 8,
    },
    rvSummaryBarWrap: {
      flexDirection: 'row', height: 8, borderRadius: 4,
      overflow: 'hidden', backgroundColor: C.lineSoft,
    },
    rvSummaryBar: { height: 8 },
    rvSummaryLegend: {
      flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 12,
    },
    rvSummaryLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    rvSummaryLegendDot: { width: 7, height: 7, borderRadius: 4 },
    rvSummaryLegendText: { fontFamily: F.semibold, fontSize: 11, color: C.ink3 },
    rvSummaryLegendCount: { fontFamily: F.bold, fontSize: 11, color: C.ink },

    // Filter chips (Telegram-folders)
    rvFilters: { marginBottom: 14 },
    rvFiltersRow: { flexDirection: 'row', gap: 8, paddingHorizontal: pad, paddingRight: pad + 4 },

    // Review card (FlatList row)
    rvList: { paddingHorizontal: pad, paddingBottom: 110 },
    rvCard: {
      flexDirection: 'row', gap: 12,
      paddingHorizontal: 14, paddingVertical: 14,
      backgroundColor: C.surface, borderRadius: 14,
      borderWidth: 1, borderColor: C.line,
      ...SHADOW_CARD,
    },
    rvCardUnread: {
      borderColor: C.purpleLine, backgroundColor: C.surface,
      borderLeftWidth: 3, borderLeftColor: C.warn, paddingLeft: 12,
    },
    rvAvatar: {
      width: 40, height: 40, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
    },
    rvAvatarText: { fontFamily: F.extrabold, fontSize: 14, color: C.surface },
    rvCardBody: { flex: 1, minWidth: 0 },
    rvCardHead: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginBottom: 4,
    },
    rvCardName: {
      fontFamily: F.extrabold, fontSize: 14, color: C.ink, letterSpacing: -0.2,
      flex: 1, minWidth: 0,
    },
    rvCardTime: { fontFamily: F.semibold, fontSize: 11, color: C.ink4 },
    rvCardMetaRow: {
      flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap',
    },
    rvCardBranch: {
      fontFamily: F.semibold, fontSize: 11, color: C.ink3,
      backgroundColor: C.paper,
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
      borderWidth: 1, borderColor: C.lineSoft,
    },
    rvCardSentiment: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 50,
    },
    rvCardSentimentText: { fontFamily: F.extrabold, fontSize: 10, letterSpacing: 0.4 },
    rvCardStarsRow: { flexDirection: 'row', gap: 1, alignItems: 'center' },
    rvCardStar: { fontSize: 11 },
    rvCardText: {
      fontFamily: F.medium, fontSize: 13, color: C.ink, lineHeight: 18,
      marginBottom: 4,
    },
    rvCardAi: {
      fontFamily: F.medium, fontSize: 11.5, color: C.ink3,
      fontStyle: 'italic', lineHeight: 16,
    },
    rvCardStatusOk: {
      fontFamily: F.bold, fontSize: 10, color: C.good,
      letterSpacing: 0.4, marginTop: 4,
    },

    // Review detail modal
    rvDetailHeader: {
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    rvDetailAvatar: {
      width: 44, height: 44, borderRadius: 22,
      alignItems: 'center', justifyContent: 'center',
    },
    rvDetailAvatarText: { fontFamily: F.extrabold, fontSize: 16, color: C.surface },
    rvDetailHeadText: { flex: 1 },
    rvDetailName: {
      fontFamily: F.extrabold, fontSize: scale(17), color: C.ink, letterSpacing: -0.4,
    },
    rvDetailMeta: {
      fontFamily: F.semibold, fontSize: 11, color: C.ink3, marginTop: 2,
    },
    rvDetailBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    rvDetailBadgeRow: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14,
    },
    rvDetailAi: {
      backgroundColor: C.hintBg, borderColor: C.hintLine, borderWidth: 1,
      borderRadius: 12, padding: 12, marginBottom: 14,
    },
    rvDetailAiHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
    rvDetailAiTitle: {
      fontFamily: F.extrabold, fontSize: 10, color: C.hintInk,
      letterSpacing: 1.8, textTransform: 'uppercase',
    },
    rvDetailAiText: { fontFamily: F.medium, fontSize: 13, color: C.ink2, lineHeight: 18 },
    rvDetailMessage: {
      backgroundColor: C.paper, borderRadius: 12, borderWidth: 1, borderColor: C.lineSoft,
      paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
    },
    rvDetailMessageText: { fontFamily: F.regular, fontSize: 14, color: C.ink, lineHeight: 21 },
    rvDetailStarsBig: {
      flexDirection: 'row', justifyContent: 'center', gap: 4, marginVertical: 10,
    },
    rvDetailStarBig: { fontSize: 28 },
    rvDetailFooter: {
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
      borderTopWidth: 1, borderTopColor: C.lineSoft,
      gap: 10,
    },
    rvDetailReplyWrap: {
      backgroundColor: C.paper, borderWidth: 1, borderColor: C.line,
      borderRadius: 12, padding: 4,
    },
    rvDetailReplyInput: {
      minHeight: 80, maxHeight: 240,
      paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10,
      fontFamily: F.regular, fontSize: 14, color: C.ink, lineHeight: 20,
    },

    // ════════════════════════════════════════════════════════════════
    // PLACEHOLDER SCREENS
    // ════════════════════════════════════════════════════════════════
    placeholderRoot: {
      flex: 1, paddingHorizontal: pad, paddingTop: 40,
      alignItems: 'center', justifyContent: 'flex-start',
    },
    placeholderIcon: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: C.purpleSoft,
      alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    },
    placeholderTitle: {
      fontFamily: F.extrabold, fontSize: scale(22), color: C.ink,
      letterSpacing: -0.6, textAlign: 'center', marginBottom: 8,
    },
    placeholderSub: {
      fontFamily: F.medium, fontSize: 14, color: C.ink3,
      textAlign: 'center', lineHeight: 20, maxWidth: 320,
    },
    placeholderTag: {
      marginTop: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50,
      backgroundColor: C.lime,
    },
    placeholderTagText: {
      fontFamily: F.extrabold, fontSize: 10, color: C.ink,
      letterSpacing: 1.6, textTransform: 'uppercase',
    },

    // ════════════════════════════════════════════════════════════════
    // MENU (More screen + Auto-reply settings)
    // ════════════════════════════════════════════════════════════════
    menuSection: { marginBottom: 18 },
    menuSectionTitle: {
      paddingHorizontal: pad, marginBottom: 8,
      fontFamily: F.bold, fontSize: 10, color: C.ink3,
      letterSpacing: 2.2, textTransform: 'uppercase',
    },
    menuCard: {
      marginHorizontal: pad,
      backgroundColor: C.surface, borderRadius: 14,
      borderWidth: 1, borderColor: C.line, ...SHADOW_CARD,
      overflow: 'hidden',
    },
    menuRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    menuRowLast: { borderBottomWidth: 0 },
    menuIconWrap: {
      width: 34, height: 34, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    menuRowTitle: { fontFamily: F.bold, fontSize: 14, color: C.ink, letterSpacing: -0.2 },
    menuRowSub: { fontFamily: F.medium, fontSize: 11, color: C.ink3, marginTop: 2 },
    menuRowValue: { fontFamily: F.bold, fontSize: 12, color: C.ink3, marginRight: 4 },
    menuRowValueOn: { color: C.purpleDeep },
    menuRowDisabled: { opacity: 0.5 },

    // Settings row with Switch
    setRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    setRowLast: { borderBottomWidth: 0 },
    setRowText: { flex: 1 },
    setRowTitle: { fontFamily: F.bold, fontSize: 14, color: C.ink, letterSpacing: -0.2 },
    setRowSub: { fontFamily: F.medium, fontSize: 11, color: C.ink3, marginTop: 2 },
    setRowDot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },

    // Settings hero (главный toggle с описанием)
    setHero: {
      marginHorizontal: pad, marginBottom: 16, padding: 18,
      backgroundColor: C.surface, borderRadius: 16,
      borderWidth: 1, borderColor: C.line, ...SHADOW_CARD,
    },
    setHeroRow: {
      flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10,
    },
    setHeroIcon: {
      width: 44, height: 44, borderRadius: 12,
      backgroundColor: C.purpleSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    setHeroTitle: {
      fontFamily: F.extrabold, fontSize: scale(18), color: C.ink,
      letterSpacing: -0.4,
    },
    setHeroSub: {
      fontFamily: F.medium, fontSize: 12, color: C.ink3, lineHeight: 17, marginTop: 2,
    },
    setHeroDesc: {
      fontFamily: F.medium, fontSize: 13, color: C.ink2, lineHeight: 18,
      paddingTop: 12, borderTopWidth: 1, borderTopColor: C.lineSoft,
    },

    // Pills (для reminder/tone выбора)
    pillsRow: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 7,
      paddingHorizontal: 14, paddingVertical: 12,
    },
    pill: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, overflow: 'hidden',
    },
    pillActive: { backgroundColor: C.ink, borderColor: C.ink },
    pillText: { fontFamily: F.bold, fontSize: 12.5, color: C.ink2 },
    pillTextActive: { color: C.surface },

    // Header back-button row
    backHeader: {
      paddingHorizontal: pad, paddingTop: 8, paddingBottom: 10,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 11, overflow: 'hidden',
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
      alignItems: 'center', justifyContent: 'center',
    },

    // Draft indicator на карточке отзыва
    rvCardDraft: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 50,
      backgroundColor: C.purpleSoft, marginTop: 4, alignSelf: 'flex-start',
    },
    rvCardDraftText: {
      fontFamily: F.extrabold, fontSize: 10, color: C.purpleDeep,
      letterSpacing: 1.2, textTransform: 'uppercase',
    },

    // Draft banner внутри ReviewDetailModal над textarea
    rvDetailDraftBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 12, paddingVertical: 10,
      backgroundColor: C.purpleSoft,
      borderWidth: 1, borderColor: C.purpleLine, borderRadius: 10,
      marginBottom: 8,
    },
    rvDetailDraftIcon: {
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: C.surface,
      alignItems: 'center', justifyContent: 'center',
    },
    rvDetailDraftTitle: {
      fontFamily: F.extrabold, fontSize: 11, color: C.purpleDeep,
      letterSpacing: 1.4, textTransform: 'uppercase',
    },
    rvDetailDraftSub: {
      fontFamily: F.medium, fontSize: 11, color: C.ink3, marginTop: 1,
    },
    rvDetailRejectLink: {
      fontFamily: F.semibold, fontSize: 12, color: C.warn,
      textDecorationLine: 'underline',
      textAlign: 'center', marginTop: 8, padding: 6,
    },

    // ════════════════════════════════════════════════════════════════
    // BRANCH RATINGS (рейтинг по точкам в Аналитике)
    // ════════════════════════════════════════════════════════════════
    brList: {
      marginHorizontal: pad, marginBottom: 24,
      backgroundColor: C.surface, borderRadius: 14,
      borderWidth: 1, borderColor: C.line,
      paddingHorizontal: 14, ...SHADOW_CARD,
    },
    brRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 13,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    brRowLast: { borderBottomWidth: 0 },
    brName: {
      flex: 1, fontFamily: F.bold, fontSize: 13, color: C.ink, letterSpacing: -0.2,
    },
    brStarsRow: { flexDirection: 'row', gap: 2, alignItems: 'center' },
    brStar: { fontSize: 13 },
    brAvg: {
      fontFamily: F.extrabold, fontSize: 14, color: C.ink, letterSpacing: -0.2,
      marginLeft: 6, minWidth: 28, textAlign: 'right',
    },
    brCount: {
      fontFamily: F.semibold, fontSize: 11, color: C.ink4,
      marginLeft: 4, minWidth: 36, textAlign: 'right',
    },
    brEmpty: {
      paddingVertical: 24, alignItems: 'center',
    },
    brEmptyText: { fontFamily: F.semibold, fontSize: 12, color: C.ink3 },

    requireReplyHint: {
      flexDirection: 'row', gap: 8,
      backgroundColor: C.warnSoft, borderWidth: 1, borderColor: '#FCA5A5',
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
      alignItems: 'flex-start',
    },
    requireReplyHintText: {
      flex: 1,
      fontFamily: F.medium, fontSize: 12, color: C.warn,
      lineHeight: 17,
    },

    // ════════════════════════════════════════════════════════════════
    // DATE RANGE MODAL — произвольный период
    // ════════════════════════════════════════════════════════════════
    dateRangeBody: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
    dateRangeRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
    },
    dateField: {
      flex: 1, paddingHorizontal: 12, paddingVertical: 10,
      backgroundColor: C.paper, borderWidth: 1, borderColor: C.line,
      borderRadius: 12,
    },
    dateFieldLabel: {
      fontFamily: F.bold, fontSize: 9, color: C.ink3,
      letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4,
    },
    dateFieldInput: {
      fontFamily: F.bold, fontSize: 16, color: C.ink, letterSpacing: -0.2,
      padding: 0,
    },
    dateRangeDash: { fontFamily: F.bold, fontSize: 18, color: C.ink4 },
    dateRangeError: {
      fontFamily: F.semibold, fontSize: 12, color: C.warn,
      paddingHorizontal: 4, marginBottom: 8,
    },
    dateRangePresets: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 7,
      marginBottom: 6,
    },

    // ════════════════════════════════════════════════════════════════
    // CHAT
    // ════════════════════════════════════════════════════════════════
    chatRoot: { flex: 1, backgroundColor: C.bg },

    // Шапка
    chatHeader: {
      paddingHorizontal: pad, paddingTop: 8, paddingBottom: 12,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    chatHeaderAvatarWrap: { width: 42, height: 42, position: 'relative' },
    chatHeaderAvatar: {
      width: 42, height: 42, borderRadius: 21,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: C.purpleDeep,
      shadowColor: C.purpleDeep,
      shadowOpacity: 0.32, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
    },
    chatHeaderAvatarText: { fontFamily: F.extrabold, fontSize: 15, color: C.surface },
    chatHeaderOnlineDot: {
      position: 'absolute', right: 0, bottom: 0,
      width: 12, height: 12, borderRadius: 6,
      backgroundColor: C.good,
      borderWidth: 2, borderColor: C.surface,
    },
    chatHeaderText: { flex: 1 },
    chatHeaderName: { fontFamily: F.extrabold, fontSize: scale(16), color: C.ink, letterSpacing: -0.3 },
    chatHeaderRole: { fontFamily: F.semibold, fontSize: 11, color: C.ink3, marginTop: 2 },
    chatHeaderStatus: {
      flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2,
    },
    chatHeaderStatusOn: { fontFamily: F.bold, fontSize: 11, color: C.good },
    chatHeaderStatusOff: { fontFamily: F.semibold, fontSize: 11, color: C.ink3 },

    // Кнопка звонка в шапке чата (справа от имени)
    chatHeaderCallBtn: {
      width: 40, height: 40, borderRadius: 20, overflow: 'hidden',
      backgroundColor: C.purpleSoft, borderWidth: 1, borderColor: C.purpleLine,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },

    // Список сообщений
    chatList: { flex: 1 },
    chatListContent: {
      paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12,
    },

    // Day separator
    daySep: {
      alignItems: 'center', marginVertical: 12,
    },
    daySepPill: {
      paddingHorizontal: 12, paddingVertical: 4, borderRadius: 50,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    },
    daySepText: {
      fontFamily: F.bold, fontSize: 11, color: C.ink3,
      letterSpacing: 0.6, textTransform: 'lowercase',
    },

    // Bubble
    bubbleRow: {
      flexDirection: 'row', marginVertical: 2, paddingHorizontal: 4,
    },
    bubbleRowUser: { justifyContent: 'flex-end' },
    bubbleRowMgr:  { justifyContent: 'flex-start' },
    bubble: {
      maxWidth: '78%', minWidth: 60,
      paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16,
      ...SHADOW_CARD,
    },
    bubbleUser: { backgroundColor: C.purple, borderBottomRightRadius: 5 },
    bubbleMgr:  { backgroundColor: C.surface, borderBottomLeftRadius: 5, borderWidth: 1, borderColor: C.line },
    bubbleTextUser: { fontFamily: F.medium, fontSize: 14, color: C.surface, lineHeight: 19 },
    bubbleTextMgr:  { fontFamily: F.medium, fontSize: 14, color: C.ink,     lineHeight: 19 },
    bubbleMetaRow: {
      flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
      alignSelf: 'flex-end',
    },
    bubbleTime: { fontFamily: F.semibold, fontSize: 10 },
    bubbleTimeUser: { color: 'rgba(255,255,255,0.7)' },
    bubbleTimeMgr:  { color: C.ink4 },
    bubbleStatus: { fontSize: 11, marginLeft: 1, lineHeight: 12 },

    // Quick replies (горизонтальный скролл над input)
    qrScroll: {
      flexGrow: 0, flexShrink: 0,
      backgroundColor: C.bg,
      maxHeight: 50,
    },
    qrRow: {
      flexDirection: 'row',
      paddingHorizontal: 12, paddingVertical: 7,
      alignItems: 'center',
    },
    qrChip: {
      paddingHorizontal: 13, paddingVertical: 7, borderRadius: 50, overflow: 'hidden',
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
      marginRight: 7,
      // critical для web — иначе чип тянется на ширину родителя
      flexShrink: 0, flexGrow: 0,
      alignSelf: 'center',
    },
    qrChipText: { fontFamily: F.semibold, fontSize: 12.5, color: C.ink2 },

    // Input bar — нормальный паддинг; от TabBar клиренс делается на уровне KAV в ChatScreen
    chatInputBar: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 10,
      paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12,
    },
    chatInputAttach: {
      width: 44, height: 44, borderRadius: 22, overflow: 'hidden',
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    chatInputWrap: {
      flex: 1, minHeight: 44, maxHeight: 120,
      backgroundColor: C.surface, borderRadius: 22,
      borderWidth: 1, borderColor: C.line,
      paddingHorizontal: 16, paddingVertical: 8,
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    chatInput: {
      fontFamily: F.regular, fontSize: 14, color: C.ink, lineHeight: 19,
      paddingTop: 4, paddingBottom: 4,
      maxHeight: 100,
    },
    chatSendBtn: {
      width: 44, height: 44, borderRadius: 22, overflow: 'hidden',
      backgroundColor: C.purple,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: C.purple,
      shadowOpacity: 0.32, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
    },
    chatSendBtnDisabled: { backgroundColor: C.line },

    // Typing indicator (когда менеджер печатает)
    typingRow: {
      flexDirection: 'row', alignSelf: 'flex-start',
      paddingHorizontal: 14, paddingVertical: 10,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
      borderRadius: 16, borderBottomLeftRadius: 5,
      marginVertical: 2, marginLeft: 4,
      ...SHADOW_CARD,
    },
    typingDot: {
      width: 6, height: 6, borderRadius: 3, backgroundColor: C.ink4,
      marginHorizontal: 2,
    },

    // ════════════════════════════════════════════════════════════════
    // MANAGER CONTACT — карточка контактов в Ещё → Поддержка
    // ════════════════════════════════════════════════════════════════
    contactCard: {
      marginHorizontal: pad, marginBottom: 18, padding: 22,
      backgroundColor: C.surface, borderRadius: 18,
      borderWidth: 1, borderColor: C.line, ...SHADOW_HERO,
      alignItems: 'center',
    },
    contactBigAvatar: {
      width: 80, height: 80, borderRadius: 40,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: C.purpleDeep,
      marginBottom: 12, position: 'relative',
    },
    contactBigAvatarText: { fontFamily: F.extrabold, fontSize: 28, color: C.surface, letterSpacing: -0.5 },
    contactBigAvatarDot: {
      position: 'absolute', right: 4, bottom: 4,
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: C.good,
      borderWidth: 3, borderColor: C.surface,
    },
    contactName: {
      fontFamily: F.extrabold, fontSize: scale(22), color: C.ink,
      letterSpacing: -0.5, textAlign: 'center', marginBottom: 4,
    },
    contactRolePill: {
      paddingHorizontal: 12, paddingVertical: 5, borderRadius: 50,
      backgroundColor: C.purpleSoft, marginBottom: 16,
    },
    contactRolePillText: {
      fontFamily: F.extrabold, fontSize: 11, color: C.purpleDeep,
      letterSpacing: 1.4, textTransform: 'uppercase',
    },

    contactInfoRows: {
      width: '100%', borderTopWidth: 1, borderTopColor: C.lineSoft,
      paddingTop: 14, marginTop: 4, gap: 10,
    },
    contactInfoRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    contactInfoIcon: {
      width: 32, height: 32, borderRadius: 10,
      backgroundColor: C.paper, borderWidth: 1, borderColor: C.lineSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    contactInfoLabel: {
      fontFamily: F.bold, fontSize: 9, color: C.ink4,
      letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 1,
    },
    contactInfoValue: {
      fontFamily: F.extrabold, fontSize: 14, color: C.ink, letterSpacing: -0.2,
    },
    contactInfoValueMuted: {
      fontFamily: F.semibold, fontSize: 13, color: C.ink2,
    },

    contactActions: {
      paddingHorizontal: pad, gap: 10,
    },
    contactActionsHint: {
      fontFamily: F.medium, fontSize: 12, color: C.ink3,
      textAlign: 'center', marginTop: 12, paddingHorizontal: 20, lineHeight: 17,
    },

    // ════════════════════════════════════════════════════════════════
    // HOME DASHBOARD
    // ════════════════════════════════════════════════════════════════
    homeGreet: {
      paddingHorizontal: pad, paddingTop: 8, paddingBottom: 14,
    },
    homeGreetSuper: {
      fontFamily: F.bold, fontSize: 10, letterSpacing: 2.5,
      color: C.purple, textTransform: 'uppercase', marginBottom: 4,
    },
    homeGreetMain: {
      fontFamily: F.extrabold, fontSize: scale(26), color: C.ink, letterSpacing: -0.7,
    },
    homeGreetSub: {
      fontFamily: F.medium, fontSize: 13, color: C.ink3, marginTop: 6, lineHeight: 18,
    },

    tasksCard: {
      marginHorizontal: pad, marginBottom: 18,
      backgroundColor: C.surface, borderRadius: 18,
      borderWidth: 1, borderColor: C.line,
      paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, ...SHADOW_HERO,
    },
    tasksHeadRow: {
      flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
      paddingBottom: 12,
    },
    tasksTitle: {
      fontFamily: F.extrabold, fontSize: scale(18), color: C.ink, letterSpacing: -0.4,
    },
    tasksCount: {
      fontFamily: F.bold, fontSize: 11, color: C.ink3,
      letterSpacing: 1.4, textTransform: 'uppercase',
    },
    taskRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.lineSoft,
    },
    taskIconWrap: {
      width: 38, height: 38, borderRadius: 11,
      alignItems: 'center', justifyContent: 'center',
    },
    taskTextWrap: { flex: 1, minWidth: 0 },
    taskTitle: {
      fontFamily: F.bold, fontSize: 14, color: C.ink, letterSpacing: -0.2,
    },
    taskSub: {
      fontFamily: F.medium, fontSize: 11.5, color: C.ink3, marginTop: 2,
    },
    taskBadge: {
      minWidth: 26, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 50,
      alignItems: 'center', justifyContent: 'center',
    },
    taskBadgeText: { fontFamily: F.extrabold, fontSize: 11 },
    tasksEmpty: {
      paddingVertical: 22, alignItems: 'center',
      borderTopWidth: 1, borderTopColor: C.lineSoft,
    },
    tasksEmptyEmoji: { fontSize: 28, marginBottom: 6 },
    tasksEmptyText: { fontFamily: F.semibold, fontSize: 13, color: C.ink3 },

    snapGrid: {
      paddingHorizontal: pad, marginBottom: 18,
      flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    },
    snapItem: {
      width: r.kpiCols === 1 ? '100%' : '48%', flexGrow: 1,
      backgroundColor: C.surface, borderRadius: 14,
      borderWidth: 1, borderColor: C.line,
      paddingHorizontal: 14, paddingVertical: 12, ...SHADOW_CARD,
    },
    snapItemHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    snapItemIcon: {
      width: 26, height: 26, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
    },
    snapItemLabel: {
      fontFamily: F.bold, fontSize: 9.5, color: C.ink3,
      letterSpacing: 1.6, textTransform: 'uppercase',
    },
    snapItemVal: {
      fontFamily: F.extrabold, fontSize: scale(22), color: C.ink,
      letterSpacing: -0.5, lineHeight: scale(32), paddingTop: 2,
    },
    snapItemSub: { fontFamily: F.medium, fontSize: 11, color: C.ink3, marginTop: 3 },

    feedCard: {
      marginHorizontal: pad, marginBottom: 18,
      backgroundColor: C.surface, borderRadius: 14,
      borderWidth: 1, borderColor: C.line,
      paddingHorizontal: 14, ...SHADOW_CARD,
    },
    feedRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    feedRowLast: { borderBottomWidth: 0 },
    feedIcon: {
      width: 32, height: 32, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    feedText: { flex: 1, minWidth: 0 },
    feedTitle: {
      fontFamily: F.bold, fontSize: 13, color: C.ink, letterSpacing: -0.2,
    },
    feedSub: {
      fontFamily: F.medium, fontSize: 11, color: C.ink3, marginTop: 2,
    },
    feedTime: { fontFamily: F.semibold, fontSize: 10.5, color: C.ink4 },

    quickActions: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 8,
      paddingHorizontal: pad, marginBottom: 18,
    },
    quickAction: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 50, overflow: 'hidden',
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    },
    quickActionText: { fontFamily: F.bold, fontSize: 12.5, color: C.ink },

    // ════════════════════════════════════════════════════════════════
    // CAMPAIGNS / GUESTS / BRANCHES — общие листовые элементы
    // ════════════════════════════════════════════════════════════════
    listCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, paddingVertical: 14,
      backgroundColor: C.surface, borderRadius: 14,
      borderWidth: 1, borderColor: C.line, ...SHADOW_CARD,
    },
    listIcon: {
      width: 44, height: 44, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    listIconEmoji: { fontSize: 22, lineHeight: 24 },
    listBody: { flex: 1, minWidth: 0 },
    listHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    listTitle: {
      fontFamily: F.extrabold, fontSize: 14, color: C.ink, letterSpacing: -0.3,
      flex: 1, minWidth: 0,
    },
    listTime: { fontFamily: F.semibold, fontSize: 11, color: C.ink4 },
    listSub: {
      fontFamily: F.medium, fontSize: 12, color: C.ink3,
      marginTop: 4, lineHeight: 17,
    },
    listMetaRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6,
    },
    listMetaPill: {
      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50,
      backgroundColor: C.paper, borderWidth: 1, borderColor: C.lineSoft,
    },
    listMetaText: { fontFamily: F.bold, fontSize: 10, color: C.ink2, letterSpacing: 0.4 },

    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      marginHorizontal: pad, marginBottom: 12,
      paddingHorizontal: 12, paddingVertical: 8,
      backgroundColor: C.surface, borderRadius: 12,
      borderWidth: 1, borderColor: C.line,
    },
    searchInput: {
      flex: 1, fontFamily: F.regular, fontSize: 14, color: C.ink,
      paddingVertical: 4,
    },
    searchClear: {
      width: 24, height: 24, borderRadius: 12, overflow: 'hidden',
      backgroundColor: C.lineSoft,
      alignItems: 'center', justifyContent: 'center',
    },

    emptyState: {
      paddingVertical: 60, paddingHorizontal: pad,
      alignItems: 'center', justifyContent: 'center', gap: 12,
    },
    emptyStateTitle: {
      fontFamily: F.extrabold, fontSize: 16, color: C.ink, textAlign: 'center', letterSpacing: -0.3,
    },
    emptyStateSub: {
      fontFamily: F.medium, fontSize: 13, color: C.ink3, textAlign: 'center', lineHeight: 18,
      maxWidth: 280,
    },

    statusPill: {
      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50,
      flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    statusPillSent:   { backgroundColor: C.goodSoft },
    statusPillFailed: { backgroundColor: C.warnSoft },
    statusPillSched:  { backgroundColor: C.purpleSoft },
    statusPillText:   { fontFamily: F.extrabold, fontSize: 10, letterSpacing: 0.4 },

    // ════════════════════════════════════════════════════════════════
    // RF THRESHOLDS
    // ════════════════════════════════════════════════════════════════
    thrCard: {
      marginHorizontal: pad, marginBottom: 16,
      backgroundColor: C.surface, borderRadius: 14,
      borderWidth: 1, borderColor: C.line,
      paddingHorizontal: 14, paddingVertical: 14, ...SHADOW_CARD,
    },
    thrRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    thrRowLast: { borderBottomWidth: 0 },
    thrLabel: { flex: 1, minWidth: 0 },
    thrLabelTitle: {
      fontFamily: F.extrabold, fontSize: 13, color: C.ink, letterSpacing: -0.2,
    },
    thrLabelSub: {
      fontFamily: F.medium, fontSize: 11, color: C.ink3, marginTop: 2,
    },
    thrStepper: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: C.paper, borderRadius: 50,
      borderWidth: 1, borderColor: C.line, paddingHorizontal: 4, paddingVertical: 2,
    },
    thrStepBtn: {
      width: 30, height: 30, borderRadius: 15, overflow: 'hidden',
      alignItems: 'center', justifyContent: 'center',
    },
    thrStepBtnText: { fontFamily: F.extrabold, fontSize: 17, color: C.ink2 },
    thrStepValue: {
      minWidth: 32, textAlign: 'center',
      fontFamily: F.extrabold, fontSize: 14, color: C.ink, letterSpacing: -0.2,
    },

    // ════════════════════════════════════════════════════════════════
    // CHAT — attachments
    // ════════════════════════════════════════════════════════════════
    chatAttachPreviewRow: {
      flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 6,
      backgroundColor: C.surface,
    },
    chatAttachPreviewItem: {
      width: 60, height: 60, borderRadius: 10, overflow: 'hidden',
      backgroundColor: C.paper, borderWidth: 1, borderColor: C.line,
      position: 'relative',
    },
    chatAttachPreviewImg: { width: '100%', height: '100%' },
    chatAttachPreviewClose: {
      position: 'absolute', top: 2, right: 2,
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: 'rgba(24,24,27,0.7)',
      alignItems: 'center', justifyContent: 'center',
    },
    bubbleImage: {
      width: 200, height: 150, borderRadius: 10, marginTop: 4,
      backgroundColor: C.lineSoft,
    },
    bubbleFile: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 10, paddingVertical: 8, marginTop: 4,
      borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)',
    },
    bubbleFileText: { fontFamily: F.bold, fontSize: 12, color: C.surface, flex: 1 },

    // ════════════════════════════════════════════════════════════════
    // AUTH — экран логина
    // ════════════════════════════════════════════════════════════════
    authRoot: {
      flex: 1, backgroundColor: C.bg,
      paddingHorizontal: Math.max(pad, 22), paddingTop: 60,
    },
    authLogo: {
      alignSelf: 'center', marginBottom: 36,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    authLogoIcon: {
      width: 56, height: 56, borderRadius: 14,
      backgroundColor: C.purple,
      alignItems: 'center', justifyContent: 'center', ...SHADOW_FAB,
    },
    authLogoText: {
      fontFamily: F.extrabold, fontSize: 32, color: C.ink, letterSpacing: -1,
    },
    authTitle: {
      fontFamily: F.extrabold, fontSize: scale(26), color: C.ink,
      letterSpacing: -0.6, textAlign: 'center', marginBottom: 8,
    },
    authSub: {
      fontFamily: F.medium, fontSize: 14, color: C.ink3,
      textAlign: 'center', marginBottom: 32, lineHeight: 20,
    },
    authField: {
      backgroundColor: C.surface, borderRadius: 14,
      borderWidth: 1, borderColor: C.line,
      paddingHorizontal: 14, marginBottom: 12,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    authFieldFocused: { borderColor: C.purple, borderWidth: 2 },
    authInput: {
      flex: 1, paddingVertical: 14,
      fontFamily: F.medium, fontSize: 15, color: C.ink, lineHeight: 20,
    },
    authError: {
      backgroundColor: C.warnSoft, borderColor: '#FCA5A5', borderWidth: 1,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
    },
    authErrorText: { fontFamily: F.semibold, fontSize: 13, color: C.warn, lineHeight: 18 },
    authSubmit: {
      backgroundColor: C.purple, borderRadius: 14,
      paddingVertical: 16, marginTop: 8, marginBottom: 16, overflow: 'hidden',
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    authSubmitText: { fontFamily: F.extrabold, fontSize: 15, color: C.surface, letterSpacing: 0.3 },
    authForgot: {
      fontFamily: F.semibold, fontSize: 13, color: C.purpleDeep,
      textAlign: 'center', paddingVertical: 8,
    },
    authFooter: {
      position: 'absolute', bottom: 30, left: 0, right: 0,
      alignItems: 'center', paddingHorizontal: 24,
    },
    authFooterText: {
      fontFamily: F.medium, fontSize: 12, color: C.ink4,
      textAlign: 'center', lineHeight: 17,
    },

    // ════════════════════════════════════════════════════════════════
    // AUDIT LOG — журнал
    // ════════════════════════════════════════════════════════════════
    auditCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      paddingHorizontal: 14, paddingVertical: 13,
      backgroundColor: C.surface, borderRadius: 12,
      borderWidth: 1, borderColor: C.line,
    },
    auditIcon: {
      width: 32, height: 32, borderRadius: 9,
      alignItems: 'center', justifyContent: 'center',
    },
    auditBody: { flex: 1, minWidth: 0 },
    auditHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
    auditStaffName: {
      fontFamily: F.bold, fontSize: 13, color: C.ink, letterSpacing: -0.2, flexShrink: 1,
    },
    auditAction: {
      fontFamily: F.semibold, fontSize: 12, color: C.purpleDeep,
      backgroundColor: C.purpleSoft,
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
    },
    auditDetails: {
      fontFamily: F.medium, fontSize: 13, color: C.ink2, lineHeight: 18, marginTop: 2,
    },
    auditTarget: {
      fontFamily: F.bold, color: C.ink,
    },
    auditTime: {
      fontFamily: F.semibold, fontSize: 11, color: C.ink4, marginTop: 5,
    },

    // ════════════════════════════════════════════════════════════════
    // GLOBAL SEARCH
    // ════════════════════════════════════════════════════════════════
    searchHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: Math.max(pad, 18), paddingTop: 8, paddingBottom: 14,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    searchHeaderInputWrap: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: C.surface,
      borderWidth: 1, borderColor: C.line, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 4,
    },
    searchHeaderInput: {
      flex: 1, fontFamily: F.regular, fontSize: 15, color: C.ink, paddingVertical: 10,
    },
    searchSection: { marginBottom: 18 },
    searchSectionTitle: {
      paddingHorizontal: Math.max(pad, 18), marginBottom: 8, marginTop: 12,
      fontFamily: F.bold, fontSize: 11, color: C.ink3,
      letterSpacing: 1.4, textTransform: 'uppercase',
    },
    searchHit: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: Math.max(pad, 18), paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    searchHitIcon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    searchHitTitle: { fontFamily: F.bold, fontSize: 14, color: C.ink, letterSpacing: -0.2 },
    searchHitSub: { fontFamily: F.medium, fontSize: 12, color: C.ink3, marginTop: 2 },
    searchHitMatch: {
      fontFamily: F.regular, fontSize: 12, color: C.ink2, marginTop: 4,
      fontStyle: 'italic',
    },
    searchEmpty: {
      paddingTop: 60, alignItems: 'center', paddingHorizontal: 24, gap: 10,
    },

    // ════════════════════════════════════════════════════════════════
    // PRESENCE — кто из коллег сейчас работает с отзывом
    // ════════════════════════════════════════════════════════════════
    presencePill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50,
      backgroundColor: C.warnSoft, borderWidth: 1, borderColor: '#FCA5A5',
      alignSelf: 'flex-start', marginTop: 6,
    },
    presencePillText: {
      fontFamily: F.bold, fontSize: 10.5, color: C.warn, letterSpacing: 0.4,
    },
    presenceDot: {
      width: 6, height: 6, borderRadius: 3, backgroundColor: C.warn,
    },
    presenceBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 14, paddingVertical: 10,
      backgroundColor: C.warnSoft,
      borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 12,
      marginHorizontal: 20, marginBottom: 10,
    },
    presenceBannerIcon: {
      width: 28, height: 28, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: C.warn,
    },
    presenceBannerText: {
      flex: 1, fontFamily: F.bold, fontSize: 12.5, color: C.warn, lineHeight: 16,
    },

    // ════════════════════════════════════════════════════════════════
    // PROFILE — карточка с аватаркой и редактируемые поля
    // ════════════════════════════════════════════════════════════════
    profileHero: {
      marginHorizontal: pad, marginBottom: 16, padding: 18,
      backgroundColor: C.surface, borderRadius: 18,
      borderWidth: 1, borderColor: C.line,
      alignItems: 'center', ...SHADOW_HERO,
    },
    profileAvatarWrap: {
      width: 96, height: 96, borderRadius: 48,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 12, position: 'relative',
    },
    profileAvatarText: {
      fontFamily: F.extrabold, fontSize: 34, color: C.surface, letterSpacing: -1,
    },
    profileAvatarEdit: {
      position: 'absolute', right: -2, bottom: -2,
      width: 30, height: 30, borderRadius: 15, overflow: 'hidden',
      backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center',
      borderWidth: 3, borderColor: C.surface,
    },
    profileName: {
      fontFamily: F.extrabold, fontSize: scale(20), color: C.ink,
      letterSpacing: -0.5, textAlign: 'center', marginBottom: 6,
      paddingHorizontal: 8,
    },
    profileRolePill: {
      paddingHorizontal: 12, paddingVertical: 5, borderRadius: 50,
      backgroundColor: C.lime,
    },
    profileRolePillText: {
      fontFamily: F.extrabold, fontSize: 11, color: C.ink,
      letterSpacing: 1.4, textTransform: 'uppercase',
    },

    fieldCard: {
      marginHorizontal: pad, marginBottom: 12,
      backgroundColor: C.surface, borderRadius: 14,
      borderWidth: 1, borderColor: C.line, ...SHADOW_CARD,
      overflow: 'hidden',
    },
    fieldRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, paddingVertical: 13,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    fieldRowLast: { borderBottomWidth: 0 },
    fieldIcon: {
      width: 32, height: 32, borderRadius: 10,
      backgroundColor: C.paper, borderWidth: 1, borderColor: C.lineSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    fieldText: { flex: 1, minWidth: 0 },
    fieldLabel: {
      fontFamily: F.bold, fontSize: 9.5, color: C.ink4,
      letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 2,
    },
    fieldValue: {
      fontFamily: F.extrabold, fontSize: 14, color: C.ink, letterSpacing: -0.2,
    },
    fieldValueMuted: {
      fontFamily: F.medium, fontSize: 13, color: C.ink3,
    },
    fieldInput: {
      fontFamily: F.bold, fontSize: 14, color: C.ink, letterSpacing: -0.2,
      paddingVertical: 0,
    },

    // ════════════════════════════════════════════════════════════════
    // PAYMENT REMINDER — компактная карточка справа сверху на Home
    // + модалка выбора банка
    // ════════════════════════════════════════════════════════════════
    payReminder: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      marginHorizontal: pad, marginBottom: 16,
      paddingHorizontal: 14, paddingVertical: 12,
      backgroundColor: C.warnSoft, borderRadius: 14,
      borderWidth: 1, borderColor: '#FCA5A5',
    },
    payReminderIcon: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: C.warn, alignItems: 'center', justifyContent: 'center',
    },
    payReminderBody: { flex: 1, minWidth: 0 },
    payReminderTitle: {
      fontFamily: F.extrabold, fontSize: 13, color: C.warn, letterSpacing: -0.2,
    },
    payReminderSub: {
      fontFamily: F.medium, fontSize: 11.5, color: C.ink3, marginTop: 2,
    },
    payReminderBtn: {
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 50,
      backgroundColor: C.warn, overflow: 'hidden',
    },
    payReminderBtnText: { fontFamily: F.extrabold, fontSize: 11, color: C.surface, letterSpacing: 0.4 },

    payCorner: {
      position: 'absolute', top: 12, right: pad, zIndex: 10,
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 10, paddingVertical: 7, borderRadius: 50,
      backgroundColor: C.warnSoft, borderWidth: 1, borderColor: '#FCA5A5',
    },
    payCornerText: { fontFamily: F.extrabold, fontSize: 10.5, color: C.warn, letterSpacing: 0.3 },

    bankRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, paddingVertical: 14,
      backgroundColor: C.paper, borderRadius: 12,
      borderWidth: 1, borderColor: C.line,
      marginBottom: 8,
    },
    bankLogo: {
      width: 40, height: 40, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    bankLogoText: { fontFamily: F.extrabold, fontSize: 13, color: C.surface, letterSpacing: -0.2 },
    bankName: { flex: 1, fontFamily: F.bold, fontSize: 14, color: C.ink, letterSpacing: -0.2 },

    // ════════════════════════════════════════════════════════════════
    // STAFF / PERMISSIONS
    // ════════════════════════════════════════════════════════════════
    staffCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, paddingVertical: 14,
      backgroundColor: C.surface, borderRadius: 14,
      borderWidth: 1, borderColor: C.line, ...SHADOW_CARD,
    },
    staffCardInactive: { opacity: 0.55 },
    staffAvatar: {
      width: 44, height: 44, borderRadius: 22,
      alignItems: 'center', justifyContent: 'center',
    },
    staffAvatarText: { fontFamily: F.extrabold, fontSize: 16, color: C.surface },
    staffBody: { flex: 1, minWidth: 0 },
    staffName: { fontFamily: F.extrabold, fontSize: 14, color: C.ink, letterSpacing: -0.2 },
    staffMeta: {
      flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4,
    },
    staffRolePill: {
      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50,
      flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    staffRolePillOwner:   { backgroundColor: C.lime },
    staffRolePillManager: { backgroundColor: C.purpleSoft },
    staffRolePillViewer:  { backgroundColor: C.lineSoft },
    staffRolePillText:    { fontFamily: F.extrabold, fontSize: 10, letterSpacing: 0.4 },
    staffStatusOff: {
      fontFamily: F.bold, fontSize: 10, color: C.ink4,
      backgroundColor: C.lineSoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 50,
      letterSpacing: 0.4, textTransform: 'uppercase', overflow: 'hidden',
    },
    staffActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.good },

    // permission row in modal
    permRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    permRowLast: { borderBottomWidth: 0 },
    permLabel: { flex: 1 },
    permTitle: { fontFamily: F.bold, fontSize: 13, color: C.ink, letterSpacing: -0.2 },
    permSub: { fontFamily: F.medium, fontSize: 11, color: C.ink3, marginTop: 2 },

    // ════════════════════════════════════════════════════════════════
    // FAQ — раздвижные карточки
    // ════════════════════════════════════════════════════════════════
    faqCard: {
      marginHorizontal: pad, marginBottom: 8,
      backgroundColor: C.surface, borderRadius: 14,
      borderWidth: 1, borderColor: C.line, overflow: 'hidden', ...SHADOW_CARD,
    },
    faqHead: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 14, paddingVertical: 14,
    },
    faqIcon: {
      width: 32, height: 32, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: C.purpleSoft,
    },
    faqQ: { flex: 1, fontFamily: F.bold, fontSize: 13.5, color: C.ink, letterSpacing: -0.2 },
    faqBody: {
      paddingHorizontal: 14, paddingTop: 0, paddingBottom: 14,
      borderTopWidth: 1, borderTopColor: C.lineSoft,
    },
    faqA: { fontFamily: F.medium, fontSize: 13, color: C.ink2, lineHeight: 19, paddingTop: 12 },

    // Sort chips bar (Reviews)
    sortBar: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: pad, marginBottom: 10, flexWrap: 'wrap',
    },
    sortBarLabel: {
      fontFamily: F.bold, fontSize: 9.5, color: C.ink3,
      letterSpacing: 1.4, textTransform: 'uppercase', marginRight: 4,
    },

    // ════════════════════════════════════════════════════════════════
    // REVIEW THREAD — пузырьки переписки внутри отзыва
    // ════════════════════════════════════════════════════════════════
    rvThreadList: {
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
      gap: 8,
    },
    rvThreadDay: {
      alignItems: 'center', marginVertical: 8,
    },
    rvThreadDayPill: {
      paddingHorizontal: 12, paddingVertical: 4, borderRadius: 50,
      backgroundColor: C.paper, borderWidth: 1, borderColor: C.lineSoft,
    },
    rvThreadDayText: {
      fontFamily: F.bold, fontSize: 10.5, color: C.ink3, letterSpacing: 0.6,
    },

    rvBubbleRowGuest: { flexDirection: 'row', justifyContent: 'flex-start', marginVertical: 2 },
    rvBubbleRowAdmin: { flexDirection: 'row', justifyContent: 'flex-end',   marginVertical: 2 },
    rvBubble: {
      maxWidth: '82%',
      paddingHorizontal: 12, paddingVertical: 9,
      borderRadius: 14, ...SHADOW_CARD,
    },
    rvBubbleGuest: {
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
      borderBottomLeftRadius: 4,
    },
    rvBubbleAdmin: {
      backgroundColor: C.purple, borderBottomRightRadius: 4,
    },
    rvBubbleText: { fontFamily: F.medium, fontSize: 14, lineHeight: 19 },
    rvBubbleTextGuest: { color: C.ink },
    rvBubbleTextAdmin: { color: C.surface },

    rvBubbleMeta: {
      flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap',
    },
    rvBubbleSource: {
      fontFamily: F.bold, fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase',
    },
    rvBubbleSourceGuest: { color: C.ink4 },
    rvBubbleSourceAdmin: { color: 'rgba(255,255,255,0.7)' },

    rvBubbleStarsRow: { flexDirection: 'row', gap: 1, marginTop: 4 },
    rvBubbleStar: { fontSize: 13 },

    rvBubbleExtra: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4,
      backgroundColor: C.paper, borderWidth: 1, borderColor: C.lineSoft,
      marginTop: 4, alignSelf: 'flex-start',
    },
    rvBubbleExtraText: { fontFamily: F.semibold, fontSize: 10.5, color: C.ink3 },

    rvBubbleAdminName: {
      fontFamily: F.bold, fontSize: 10, color: 'rgba(255,255,255,0.85)',
      marginBottom: 3, letterSpacing: 0.4,
    },

    // ════════════════════════════════════════════════════════════════
    // METRICS GRID — 16 карточек статистики (как в вебе)
    // ════════════════════════════════════════════════════════════════
    metricsGrid: {
      paddingHorizontal: pad, marginBottom: 18,
      flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    },
    metricCard: {
      width: r.kpiCols === 1 ? '100%' : r.kpiCols === 4 ? '23.5%' : '48%',
      flexGrow: 1,
      backgroundColor: C.surface, borderRadius: 14,
      borderWidth: 1, borderColor: C.line,
      paddingHorizontal: 14, paddingTop: 16, paddingBottom: 14,
      position: 'relative', overflow: 'hidden', ...SHADOW_CARD,
    },
    metricAccent: {
      position: 'absolute', top: 0, left: 14, width: 28, height: 3,
      borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
    },
    metricLabel: {
      fontFamily: F.bold, fontSize: 10.5, color: C.ink3,
      marginTop: 6, letterSpacing: 0.5, lineHeight: 14,
    },
    metricVal: {
      fontFamily: F.extrabold, fontSize: scale(28), lineHeight: scale(30),
      marginTop: 8, letterSpacing: -1, color: C.ink,
    },
    metricSub: {
      fontFamily: F.medium, fontSize: 11, color: C.ink3, marginTop: 4, lineHeight: 14,
    },

    // ════════════════════════════════════════════════════════════════
    // GUEST DETAIL — визиты, монеты, VK-статус
    // ════════════════════════════════════════════════════════════════
    gdHero: {
      marginHorizontal: pad, marginBottom: 14, padding: 18,
      backgroundColor: C.surface, borderRadius: 18,
      borderWidth: 1, borderColor: C.line, ...SHADOW_HERO,
      alignItems: 'center',
    },
    gdAvatarWrap: {
      width: 84, height: 84, borderRadius: 42,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 10,
    },
    gdAvatarText: {
      fontFamily: F.extrabold, fontSize: 30, color: C.surface, letterSpacing: -0.6,
    },
    gdName: {
      fontFamily: F.extrabold, fontSize: scale(20), color: C.ink,
      letterSpacing: -0.5, textAlign: 'center', marginBottom: 6,
    },
    gdSegPill: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50,
      backgroundColor: C.purpleSoft,
    },
    gdSegPillText: {
      fontFamily: F.extrabold, fontSize: 11, color: C.purpleDeep,
      letterSpacing: 1.2, textTransform: 'uppercase',
    },

    gdStatsRow: {
      flexDirection: 'row', marginTop: 14, paddingTop: 14, width: '100%',
      borderTopWidth: 1, borderTopColor: C.lineSoft,
    },
    gdStatCol: { flex: 1, alignItems: 'center' },
    gdStatColMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.lineSoft },
    gdStatVal: { fontFamily: F.extrabold, fontSize: 18, color: C.ink, letterSpacing: -0.3 },
    gdStatLbl: {
      fontFamily: F.bold, fontSize: 9.5, color: C.ink3,
      letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4,
    },

    visitRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    visitRowLast: { borderBottomWidth: 0 },
    visitIcon: {
      width: 32, height: 32, borderRadius: 10,
      backgroundColor: C.purpleSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    visitBranch: { fontFamily: F.bold, fontSize: 13, color: C.ink, letterSpacing: -0.2 },
    visitMeta: { fontFamily: F.medium, fontSize: 11, color: C.ink3, marginTop: 2 },

    txnRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    txnRowLast: { borderBottomWidth: 0 },
    txnIcon: {
      width: 32, height: 32, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    txnIconEarn: { backgroundColor: C.goodSoft },
    txnIconSpend: { backgroundColor: C.warnSoft },
    txnDesc: { flex: 1 },
    txnDescTitle: { fontFamily: F.bold, fontSize: 13, color: C.ink, letterSpacing: -0.2 },
    txnDescSub: { fontFamily: F.medium, fontSize: 11, color: C.ink4, marginTop: 2 },
    txnAmount: { fontFamily: F.extrabold, fontSize: 14, letterSpacing: -0.2 },
    txnAmountEarn: { color: C.good },
    txnAmountSpend: { color: C.warn },

    vkStatusRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 14, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    vkStatusIcon: {
      width: 28, height: 28, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
    },
    vkStatusOn:  { backgroundColor: C.goodSoft },
    vkStatusOff: { backgroundColor: C.lineSoft },
    vkStatusText: { fontFamily: F.semibold, fontSize: 13, color: C.ink },
    vkStatusBadge: {
      marginLeft: 'auto',
      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50,
    },
    vkStatusBadgeOn:  { backgroundColor: C.good },
    vkStatusBadgeOff: { backgroundColor: C.line },
    vkStatusBadgeText: { fontFamily: F.extrabold, fontSize: 9.5, letterSpacing: 0.4 },

    // ════════════════════════════════════════════════════════════════
    // FORM MODAL — общие стили под create/edit-формы (Catalog/Quest/Promo)
    // ════════════════════════════════════════════════════════════════
    formGroup: { marginHorizontal: pad, marginBottom: 12 },
    formLabel: {
      fontFamily: F.bold, fontSize: 10, color: C.ink3,
      letterSpacing: 1.4, textTransform: 'uppercase',
      marginBottom: 6, paddingHorizontal: 4,
    },
    formInputWrap: {
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4,
    },
    formInput: {
      fontFamily: F.regular, fontSize: 15, color: C.ink, lineHeight: 20,
      paddingVertical: 10, minHeight: 22,
    },
    formInputMulti: {
      fontFamily: F.regular, fontSize: 14, color: C.ink, lineHeight: 19,
      paddingVertical: 10, minHeight: 80, maxHeight: 200,
      textAlignVertical: 'top',
    },
    formError: {
      fontFamily: F.semibold, fontSize: 11, color: C.warn,
      marginTop: 4, paddingHorizontal: 4,
    },

    // Toggle-row inside form
    formToggle: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, paddingVertical: 12,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
      borderRadius: 12, marginBottom: 8,
    },
    formToggleText: { flex: 1 },
    formToggleTitle: { fontFamily: F.bold, fontSize: 14, color: C.ink, letterSpacing: -0.2 },
    formToggleSub: { fontFamily: F.medium, fontSize: 11.5, color: C.ink3, marginTop: 2 },

    // Image input
    imgPickerWrap: {
      marginHorizontal: pad, marginBottom: 12,
      borderRadius: 14, overflow: 'hidden', position: 'relative',
      borderWidth: 1, borderColor: C.line,
    },
    imgPickerEmpty: {
      paddingVertical: 30, paddingHorizontal: 14,
      backgroundColor: C.paper,
      borderStyle: 'dashed',
      alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    imgPickerEmptyText: { fontFamily: F.bold, fontSize: 13, color: C.ink2 },
    imgPickerEmptyHint: { fontFamily: F.medium, fontSize: 11, color: C.ink4 },
    imgPickerImg: { width: '100%', aspectRatio: 16 / 9, backgroundColor: C.lineSoft },
    imgPickerRemove: {
      position: 'absolute', top: 8, right: 8,
      width: 28, height: 28, borderRadius: 14, overflow: 'hidden',
      backgroundColor: 'rgba(24,24,27,0.7)',
      alignItems: 'center', justifyContent: 'center',
    },

    // FAB add (поднят над таб-баром: r.fabBottom + 28)
    fabAdd: {
      position: 'absolute', right: pad, bottom: r.fabBottom + 28,
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 18, paddingVertical: 14, borderRadius: 50, overflow: 'hidden',
      backgroundColor: C.purple,
      ...SHADOW_FAB, zIndex: 40,
    },
    fabAddText: { fontFamily: F.extrabold, fontSize: 13, color: C.surface, letterSpacing: 0.3 },

    // ════════════════════════════════════════════════════════════════
    // CATALOG — карточка подарка
    // ════════════════════════════════════════════════════════════════
    catCard: {
      marginHorizontal: pad,
      backgroundColor: C.surface, borderRadius: 14,
      borderWidth: 1, borderColor: C.line, ...SHADOW_CARD,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 12,
    },
    catImg: {
      width: 60, height: 60, borderRadius: 12,
      backgroundColor: C.lineSoft,
    },
    catImgPlaceholder: {
      width: 60, height: 60, borderRadius: 12,
      backgroundColor: C.purpleSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    catBody: { flex: 1, minWidth: 0 },
    catName: {
      fontFamily: F.extrabold, fontSize: 14, color: C.ink, letterSpacing: -0.2,
    },
    catMeta: {
      flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap',
    },
    catPrice: {
      fontFamily: F.extrabold, fontSize: 13, color: C.purpleDeep,
      backgroundColor: C.purpleSoft,
      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50,
    },
    catFlag: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 50,
      backgroundColor: C.lime,
    },
    catFlagText: { fontFamily: F.extrabold, fontSize: 9.5, color: C.ink, letterSpacing: 0.4 },
    catBranches: { fontFamily: F.semibold, fontSize: 10.5, color: C.ink4, marginTop: 4 },

    // ════════════════════════════════════════════════════════════════
    // DAILY CODES — display
    // ════════════════════════════════════════════════════════════════
    codeCard: {
      marginHorizontal: pad, marginBottom: 10,
      backgroundColor: C.surface, borderRadius: 14,
      borderWidth: 1, borderColor: C.line, ...SHADOW_CARD,
      paddingHorizontal: 16, paddingVertical: 16,
      flexDirection: 'row', alignItems: 'center', gap: 14,
    },
    codeCardMissing: {
      backgroundColor: C.warnSoft, borderColor: '#FCA5A5',
    },
    codeBranch: { flex: 1 },
    codeBranchName: {
      fontFamily: F.extrabold, fontSize: 14, color: C.ink, letterSpacing: -0.2,
    },
    codeBranchSub: {
      fontFamily: F.medium, fontSize: 11.5, color: C.ink3, marginTop: 2,
    },
    codeBig: {
      fontFamily: F.extrabold, fontSize: scale(28), color: C.purple,
      letterSpacing: 4, lineHeight: scale(32),
    },
    codeBigMissing: { color: C.warn, letterSpacing: 0 },

    // ════════════════════════════════════════════════════════════════
    // COIN ADJUST — модалка корректировки баланса
    // ════════════════════════════════════════════════════════════════
    adjustToggle: {
      flexDirection: 'row', backgroundColor: C.paper,
      borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 4,
      marginBottom: 14,
    },
    adjustToggleBtn: {
      flex: 1, paddingVertical: 12, borderRadius: 9, overflow: 'hidden',
      alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
    },
    adjustToggleBtnActiveAdd: { backgroundColor: C.good },
    adjustToggleBtnActiveSub: { backgroundColor: C.warn },
    adjustToggleText: { fontFamily: F.extrabold, fontSize: 13, color: C.ink3, letterSpacing: 0.3 },
    adjustToggleTextActive: { color: C.surface },
    adjustAmountWrap: {
      backgroundColor: C.surface, borderWidth: 2, borderColor: C.line,
      borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14,
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginBottom: 12,
    },
    adjustAmount: {
      flex: 1,
      fontFamily: F.extrabold, fontSize: scale(28), color: C.ink,
      letterSpacing: -1, padding: 0,
    },
    adjustCurrency: {
      fontFamily: F.bold, fontSize: 16, color: C.ink3,
    },
    adjustQuickRow: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 7,
      marginBottom: 14,
    },
    adjustQuickPill: {
      paddingHorizontal: 13, paddingVertical: 7, borderRadius: 50, overflow: 'hidden',
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    },
    adjustQuickText: { fontFamily: F.bold, fontSize: 12.5, color: C.ink2 },

    // Highlight для выбранного branch в multi-select
    branchPickRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 14, paddingVertical: 11,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    branchPickRowLast: { borderBottomWidth: 0 },
    branchPickCheckbox: {
      width: 22, height: 22, borderRadius: 6,
      borderWidth: 2, borderColor: C.line,
      alignItems: 'center', justifyContent: 'center',
    },
    branchPickCheckboxOn: { backgroundColor: C.purple, borderColor: C.purple },
    branchPickName: { flex: 1, fontFamily: F.bold, fontSize: 14, color: C.ink, letterSpacing: -0.2 },
    branchPickSub:  { fontFamily: F.medium, fontSize: 11, color: C.ink3, marginTop: 1 },
  });
}

export type S = ReturnType<typeof makeStyles>;
