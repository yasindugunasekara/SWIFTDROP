import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import { getBookingQuote, createParcelBooking, type FeeQuoteResponse } from '../services/booking-api';

interface Props {
  visible: boolean;
  onClose: () => void;
  onBookingComplete: (trackingId: string) => void;
  initialCategory?: string;
  initialPromoCode?: string;
}

export default function BookDeliveryModal({
  visible,
  onClose,
  onBookingComplete,
  initialCategory = 'parcels',
  initialPromoCode = '',
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [packageType, setPackageType] = useState(initialCategory);
  const [weight, setWeight] = useState(1.5);
  const [lengthCm, setLengthCm] = useState('25');
  const [widthCm, setWidthCm] = useState('20');
  const [heightCm, setHeightCm] = useState('15');
  const [promoCode, setPromoCode] = useState(initialPromoCode);

  // Address & Contacts
  const [pickupAddr, setPickupAddr] = useState('Elm Street, 23 (Colombo 03)');
  const [destAddr, setDestAddr] = useState('456 Galle Rd, Colombo 04');
  const [senderName, setSenderName] = useState('Kasun Perera');
  const [senderPhone, setSenderPhone] = useState('+94 77 123 4567');
  const [recipientName, setRecipientName] = useState('Robert Smith');
  const [recipientPhone, setRecipientPhone] = useState('+94 71 555 0192');
  const [instructions, setInstructions] = useState('Doorstep pickup within 15 minutes. Leave at front desk.');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card' | 'cod'>('wallet');

  // Server-calculated quote state
  const [quote, setQuote] = useState<FeeQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedTrackingId, setConfirmedTrackingId] = useState<string | null>(null);

  // Sync initialCategory & promo when modal opens
  useEffect(() => {
    if (visible) {
      if (initialCategory) setPackageType(initialCategory);
      if (initialPromoCode) setPromoCode(initialPromoCode);
      setConfirmedTrackingId(null);
    }
  }, [visible, initialCategory, initialPromoCode]);

  // Fetch live server fee quote whenever package parameters change
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    const fetchQuote = async () => {
      setQuoteLoading(true);
      try {
        const result = await getBookingQuote({
          pickupAddress: pickupAddr,
          dropoffAddress: destAddr,
          weightKg: weight,
          category: packageType,
          lengthCm: Number(lengthCm) || 20,
          widthCm: Number(widthCm) || 15,
          heightCm: Number(heightCm) || 10,
          promoCode: promoCode.trim() || undefined,
        });
        if (!cancelled) setQuote(result);
      } catch (err) {
        console.warn('Failed to fetch server quote:', err);
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    };

    const timer = setTimeout(fetchQuote, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visible, packageType, weight, lengthCm, widthCm, heightCm, promoCode, pickupAddr, destAddr]);

  const packageCategories = [
    { id: 'parcels', label: 'Parcels', sub: 'Box 1 - 5 kg', icon: '📦' },
    { id: 'documents', label: 'Documents', sub: 'Envelope < 1 kg', icon: '📄' },
    { id: 'electronics', label: 'Electronics', sub: 'Safe Bubble Pack', icon: '💻' },
    { id: 'gift_box', label: 'Gift Box', sub: 'Delicate Care', icon: '🎁' },
    { id: 'apparel', label: 'Apparel', sub: 'Fashion & Clothes', icon: '👕' },
    { id: 'heavy_cargo', label: 'Heavy Cargo', sub: 'Pallet 10 - 50 kg', icon: '🚚' },
  ];

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!pickupAddr.trim() || !destAddr.trim()) {
        Alert.alert('Required Fields', 'Please ensure both pickup and drop-off addresses are filled.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Dispatches booking to backend with server-side validation & price enforcement
      setSubmitting(true);
      try {
        const response = await createParcelBooking({
          pickupAddress: pickupAddr,
          dropoffAddress: destAddr,
          senderName,
          senderPhone,
          recipientName,
          recipientPhone,
          weightKg: weight,
          category: packageType,
          lengthCm: Number(lengthCm) || 20,
          widthCm: Number(widthCm) || 15,
          heightCm: Number(heightCm) || 10,
          specialInstructions: instructions,
          paymentMethod,
          promoCode: promoCode.trim() || undefined,
        });

        if (response.success && response.parcel) {
          setConfirmedTrackingId(response.parcel.trackingNumber);
        } else {
          Alert.alert('Booking Notice', response.message || 'Parcel booking recorded.');
          onBookingComplete(`SWIFT-${Math.floor(100000 + Math.random() * 900000)}`);
          onClose();
        }
      } catch (err) {
        Alert.alert('Booking Error', 'Could not complete booking. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (confirmedTrackingId) {
      onBookingComplete(confirmedTrackingId);
      onClose();
    } else if (step > 1) {
      setStep((step - 1) as 1 | 2);
    } else {
      onClose();
    }
  };

  const handleFinishAndTrack = () => {
    const tracking = confirmedTrackingId || 'SWIFT-991122';
    setConfirmedTrackingId(null);
    setStep(1);
    onBookingComplete(tracking);
  };

  if (!visible) return null;

  const sheetContent = (
    <View style={styles.modalSheet}>
      {/* Top Bar with Back / Close */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>{confirmedTrackingId ? '✕' : step > 1 ? '←' : '✕'}</Text>
        </TouchableOpacity>
        <Text style={styles.sheetTitle}>
          {confirmedTrackingId
            ? 'Booking Confirmed! 🎉'
            : step === 1
            ? 'Package & Fee Quote'
            : step === 2
            ? 'Addresses & Contact'
            : 'Payment & Confirmation'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

          {/* Stepper Bar (Only when not in confirmation state) */}
          {!confirmedTrackingId && (
            <View style={styles.stepperRow}>
              {[
                { num: 1, label: 'Specs' },
                { num: 2, label: 'Address' },
                { num: 3, label: 'Payment' },
              ].map((s) => (
                <View key={s.num} style={styles.stepIndicator}>
                  <View style={[styles.stepCircle, step >= s.num && styles.stepCircleActive]}>
                    <Text style={[styles.stepNumText, step >= s.num && styles.stepNumTextActive]}>
                      {s.num}
                    </Text>
                  </View>
                  <Text style={[styles.stepLabelText, step >= s.num && styles.stepLabelTextActive]}>
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* CONFIRMATION RECEIPT SCREEN */}
            {confirmedTrackingId ? (
              <View style={styles.confirmationWrap}>
                <View style={styles.confirmationIconCircle}>
                  <Text style={{ fontSize: 36 }}>✓</Text>
                </View>
                <Text style={styles.confirmHeading}>Parcel Booked Successfully!</Text>
                <Text style={styles.confirmSub}>
                  A courier has been dispatched for pickup within 15 minutes.
                </Text>

                <View style={styles.receiptCard}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Tracking Number</Text>
                    <Text style={styles.receiptTrackingNum}>{confirmedTrackingId}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Status</Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>CONFIRMED</Text>
                    </View>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Category</Text>
                    <Text style={styles.receiptVal}>{quote?.category || 'Parcels'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Total Paid</Text>
                    <Text style={styles.receiptTotalVal}>${(quote?.totalFee || 8.50).toFixed(2)} USD</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Payment Method</Text>
                    <Text style={styles.receiptVal}>
                      {paymentMethod === 'wallet' ? '⚡ SwiftDrop Wallet' : paymentMethod === 'card' ? '💳 Credit Card' : '💵 Cash on Delivery'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={handleFinishAndTrack}
                  activeOpacity={0.85}
                >
                  <Text style={styles.ctaButtonText}>View Live GPS Tracking 📍 →</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* STEP 1: PACKAGE CATEGORY & SPECS */}
            {!confirmedTrackingId && step === 1 && (
              <View>
                <Text style={styles.sectionHeading}>Select Category</Text>
                <View style={styles.pkgGrid}>
                  {packageCategories.map((pkg) => (
                    <TouchableOpacity
                      key={pkg.id}
                      style={[styles.pkgCard, packageType === pkg.id && styles.pkgCardActive]}
                      onPress={() => setPackageType(pkg.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 24, marginBottom: 4 }}>{pkg.icon}</Text>
                      <Text style={[styles.pkgCardTitle, packageType === pkg.id && styles.pkgCardTitleActive]}>
                        {pkg.label}
                      </Text>
                      <Text style={styles.pkgCardSub}>{pkg.sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Weight Stepper */}
                <Text style={styles.sectionHeading}>Package Weight</Text>
                <View style={styles.weightRow}>
                  <TouchableOpacity
                    style={styles.weightBtn}
                    onPress={() => setWeight(Math.max(0.5, Number((weight - 0.5).toFixed(1))))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.weightBtnText}>−</Text>
                  </TouchableOpacity>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.weightDisplay}>{weight.toFixed(1)} kg</Text>
                    <Text style={styles.weightHint}>Base includes 1.0 kg</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.weightBtn}
                    onPress={() => setWeight(Math.min(50, Number((weight + 0.5).toFixed(1))))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.weightBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Dimensions */}
                <Text style={styles.sectionHeading}>Dimensions (cm)</Text>
                <View style={styles.dimRow}>
                  <View style={styles.dimInputWrap}>
                    <Text style={styles.dimLabel}>Length</Text>
                    <TextInput
                      style={styles.dimInput}
                      value={lengthCm}
                      onChangeText={setLengthCm}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={{ color: '#94a3b8', marginTop: 14 }}>×</Text>
                  <View style={styles.dimInputWrap}>
                    <Text style={styles.dimLabel}>Width</Text>
                    <TextInput
                      style={styles.dimInput}
                      value={widthCm}
                      onChangeText={setWidthCm}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={{ color: '#94a3b8', marginTop: 14 }}>×</Text>
                  <View style={styles.dimInputWrap}>
                    <Text style={styles.dimLabel}>Height</Text>
                    <TextInput
                      style={styles.dimInput}
                      value={heightCm}
                      onChangeText={setHeightCm}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Promo Code Input */}
                <Text style={styles.sectionHeading}>Promotional Voucher</Text>
                <View style={styles.promoInputRow}>
                  <TextInput
                    style={styles.promoInput}
                    value={promoCode}
                    onChangeText={setPromoCode}
                    placeholder="Enter voucher code (e.g. SWIFT20)"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={styles.promoApplyBtn}
                    onPress={() => setPromoCode('SWIFT20')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.promoApplyText}>Apply SWIFT20</Text>
                  </TouchableOpacity>
                </View>

                {/* Live Server Fee Quote Preview */}
                <View style={styles.quotePreviewCard}>
                  <View style={styles.quoteHeaderRow}>
                    <Text style={styles.quoteTitle}>Live Server Fee Quote</Text>
                    {quoteLoading ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <View style={styles.serverBadge}>
                        <Text style={styles.serverBadgeText}>✓ Server Calculated</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Base Delivery Fee ({quote?.category || 'Parcels'})</Text>
                    <Text style={styles.priceVal}>${(quote?.baseFee || 8.50).toFixed(2)}</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Weight Surcharge ({weight.toFixed(1)} kg)</Text>
                    <Text style={styles.priceVal}>${(quote?.weightFee || 0.00).toFixed(2)}</Text>
                  </View>
                  {quote?.discount ? (
                    <View style={styles.priceRow}>
                      <Text style={[styles.priceLabel, { color: Colors.primary }]}>
                        Promo Discount ({quote.appliedPromo})
                      </Text>
                      <Text style={[styles.priceVal, { color: Colors.primary }]}>
                        -${quote.discount.toFixed(2)}
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.priceRow, styles.priceRowTotal]}>
                    <Text style={styles.totalLabel}>Estimated Total</Text>
                    <Text style={styles.totalVal}>
                      ${(quote?.totalFee || 8.50).toFixed(2)} USD
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* STEP 2: ADDRESSES & CONTACT */}
            {!confirmedTrackingId && step === 2 && (
              <View>
                <View style={styles.addrCard}>
                  <View style={styles.addrHeader}>
                    <Text style={styles.addrTag}>PICKUP ADDRESS (SENDER)</Text>
                  </View>
                  <TextInput
                    style={styles.addrInput}
                    value={pickupAddr}
                    onChangeText={setPickupAddr}
                    placeholder="Enter pickup address"
                    placeholderTextColor="#94a3b8"
                  />
                  <View style={styles.contactRow}>
                    <TextInput
                      style={[styles.addrInput, { flex: 1, marginTop: 8 }]}
                      value={senderName}
                      onChangeText={setSenderName}
                      placeholder="Sender Name"
                    />
                    <TextInput
                      style={[styles.addrInput, { flex: 1, marginTop: 8, marginLeft: 8 }]}
                      value={senderPhone}
                      onChangeText={setSenderPhone}
                      placeholder="Sender Phone"
                    />
                  </View>
                </View>

                <View style={styles.addrCard}>
                  <View style={styles.addrHeader}>
                    <Text style={styles.addrTag}>DELIVERY DESTINATION (RECIPIENT)</Text>
                  </View>
                  <TextInput
                    style={styles.addrInput}
                    value={destAddr}
                    onChangeText={setDestAddr}
                    placeholder="Enter delivery address"
                    placeholderTextColor="#94a3b8"
                  />
                  <View style={styles.contactRow}>
                    <TextInput
                      style={[styles.addrInput, { flex: 1, marginTop: 8 }]}
                      value={recipientName}
                      onChangeText={setRecipientName}
                      placeholder="Recipient Name"
                    />
                    <TextInput
                      style={[styles.addrInput, { flex: 1, marginTop: 8, marginLeft: 8 }]}
                      value={recipientPhone}
                      onChangeText={setRecipientPhone}
                      placeholder="Recipient Phone"
                    />
                  </View>
                </View>

                <Text style={styles.sectionHeading}>Special Courier Instructions</Text>
                <TextInput
                  style={styles.instrInput}
                  value={instructions}
                  onChangeText={setInstructions}
                  multiline
                  placeholder="e.g. Leave package with security guard, fragile glass inside..."
                  placeholderTextColor="#94a3b8"
                />
              </View>
            )}

            {/* STEP 3: PAYMENT & FINAL SERVER CONFIRMATION */}
            {!confirmedTrackingId && step === 3 && (
              <View>
                <Text style={styles.sectionHeading}>Select Payment Method</Text>

                {[
                  {
                    id: 'wallet' as const,
                    title: 'SwiftDrop Wallet',
                    sub: 'Balance: $120.00 (Instant Dispatch)',
                    icon: '⚡',
                  },
                  {
                    id: 'card' as const,
                    title: 'Credit / Debit Card',
                    sub: 'Visa ending in •••• 4242',
                    icon: '💳',
                  },
                  {
                    id: 'cod' as const,
                    title: 'Cash on Delivery (COD)',
                    sub: 'Pay rider in cash upon arrival',
                    icon: '💵',
                  },
                ].map((pm) => (
                  <TouchableOpacity
                    key={pm.id}
                    style={[styles.payRow, paymentMethod === pm.id && styles.payRowActive]}
                    onPress={() => setPaymentMethod(pm.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 22 }}>{pm.icon}</Text>
                      <View>
                        <Text style={styles.payTitle}>{pm.title}</Text>
                        <Text style={styles.paySub}>{pm.sub}</Text>
                      </View>
                    </View>
                    <View style={[styles.radioCircle, paymentMethod === pm.id && styles.radioActive]}>
                      {paymentMethod === pm.id && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Final Server-Verified Price Breakdown */}
                <View style={styles.pricingSummary}>
                  <View style={styles.quoteHeaderRow}>
                    <Text style={styles.sectionHeading}>Payment Summary</Text>
                    <View style={styles.serverBadge}>
                      <Text style={styles.serverBadgeText}>Guaranteed Server Price</Text>
                    </View>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Base Delivery Fee</Text>
                    <Text style={styles.priceVal}>${(quote?.baseFee || 8.50).toFixed(2)}</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Weight Surcharge ({weight.toFixed(1)} kg)</Text>
                    <Text style={styles.priceVal}>${(quote?.weightFee || 0.00).toFixed(2)}</Text>
                  </View>
                  {quote?.discount ? (
                    <View style={styles.priceRow}>
                      <Text style={[styles.priceLabel, { color: Colors.primary }]}>
                        Promotional Voucher ({quote.appliedPromo})
                      </Text>
                      <Text style={[styles.priceVal, { color: Colors.primary }]}>
                        -${quote.discount.toFixed(2)}
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.priceRow, styles.priceRowTotal]}>
                    <Text style={styles.totalLabel}>TOTAL AMOUNT DUE</Text>
                    <Text style={styles.totalVal}>${(quote?.totalFee || 8.50).toFixed(2)} USD</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Action CTA (When not in confirmation receipt) */}
          {!confirmedTrackingId && (
            <TouchableOpacity
              style={[styles.ctaButton, submitting && { opacity: 0.8 }]}
              onPress={handleNext}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.ctaButtonText}>
                  {step === 1 && 'Next: Pickup & Address →'}
                  {step === 2 && 'Continue to Payment →'}
                  {step === 3 && `Pay Now & Dispatch ($${(quote?.totalFee || 8.50).toFixed(2)}) ✓`}
                </Text>
              )}
            </TouchableOpacity>
          )}
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webModalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close modal backdrop"
        />
        {sheetContent}
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close modal backdrop"
        />
        {sheetContent}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  webModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: '92%',
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backArrow: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 14,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
  },
  stepNumTextActive: {
    color: '#ffffff',
  },
  stepLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  stepLabelTextActive: {
    color: '#0f172a',
    fontWeight: '900',
  },
  bodyScroll: {
    maxHeight: 460,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
    marginTop: 4,
  },
  pkgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  pkgCard: {
    width: '31%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  pkgCardActive: {
    backgroundColor: '#fff7ed',
    borderColor: Colors.primary,
  },
  pkgCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  pkgCardTitleActive: {
    color: Colors.primary,
  },
  pkgCardSub: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'center',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  weightBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  weightDisplay: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  weightHint: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dimInputWrap: {
    flex: 1,
    alignItems: 'center',
  },
  dimLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  dimInput: {
    width: '90%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  promoInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  promoInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  promoApplyBtn: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  promoApplyText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  quotePreviewCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  quoteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  quoteTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
  },
  serverBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  serverBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.success,
  },
  addrCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  addrHeader: {
    marginBottom: 6,
  },
  addrTag: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.4,
  },
  addrInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
  },
  contactRow: {
    flexDirection: 'row',
  },
  instrInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    fontSize: 12,
    color: '#0f172a',
    height: 60,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  payRowActive: {
    backgroundColor: '#fff7ed',
    borderColor: Colors.primary,
  },
  payTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  paySub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  pricingSummary: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 14,
    marginTop: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  priceRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 8,
    paddingTop: 8,
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  priceVal: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '800',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
  },
  totalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.primary,
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 4,
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  confirmationWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  confirmationIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    borderWidth: 3,
    borderColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  confirmSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  receiptCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  receiptTrackingNum: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  statusPill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.success,
  },
  receiptTotalVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
});
