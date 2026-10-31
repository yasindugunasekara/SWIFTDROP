import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { Colors } from '../theme/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onBookingComplete: (trackingId: string) => void;
}

export default function BookDeliveryModal({ visible, onClose, onBookingComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [packageType, setPackageType] = useState('small');
  const [weight, setWeight] = useState(1.5);
  const [pickupAddr, setPickupAddr] = useState('Home (34 Duplication Rd, Colombo 03)');
  const [destAddr, setDestAddr] = useState('Work (456 Galle Rd, Colombo 04)');
  const [instructions, setInstructions] = useState('Ring bell twice, leave at reception if away');
  const [paymentMethod, setPaymentMethod] = useState('wallet');

  const packageTypes = [
    { id: 'doc', label: 'Document', sub: 'Up to 1 kg', icon: '📄' },
    { id: 'small', label: 'Small Box', sub: '1 - 5 kg', icon: '📦' },
    { id: 'medium', label: 'Medium Box', sub: '5 - 10 kg', icon: '🎁' },
    { id: 'large', label: 'Large Cargo', sub: '10 - 20 kg', icon: '🚚' },
  ];

  const handleNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) {
      const generatedId = `SWIFT-${Math.floor(100000 + Math.random() * 900000)}`;
      onBookingComplete(generatedId);
      setStep(1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as 1 | 2);
    else onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Top Bar with Back / Close */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Text style={styles.backArrow}>{step > 1 ? '←' : '✕'}</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>
              {step === 1 && 'Book a Delivery'}
              {step === 2 && 'Pickup & Address'}
              {step === 3 && 'Payment Method'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          {/* 3-Step Stepper Bar */}
          <View style={styles.stepperRow}>
            {[
              { num: 1, label: 'Package' },
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

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* STEP 1: PACKAGE TYPE & SPECS */}
            {step === 1 && (
              <View>
                <Text style={styles.sectionHeading}>Select Package Category</Text>
                <View style={styles.pkgGrid}>
                  {packageTypes.map((pkg) => (
                    <TouchableOpacity
                      key={pkg.id}
                      style={[styles.pkgCard, packageType === pkg.id && styles.pkgCardActive]}
                      onPress={() => setPackageType(pkg.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 26, marginBottom: 4 }}>{pkg.icon}</Text>
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
                    onPress={() => setWeight(Math.max(0.5, weight - 0.5))}
                  >
                    <Text style={styles.weightBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.weightDisplay}>{weight.toFixed(1)} kg</Text>
                  <TouchableOpacity
                    style={styles.weightBtn}
                    onPress={() => setWeight(weight + 0.5)}
                  >
                    <Text style={styles.weightBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Dimensions */}
                <Text style={styles.sectionHeading}>Dimensions (cm)</Text>
                <View style={styles.dimRow}>
                  <TextInput style={styles.dimInput} defaultValue="20" placeholder="L" keyboardType="numeric" />
                  <Text style={{ color: '#cbd5e1' }}>×</Text>
                  <TextInput style={styles.dimInput} defaultValue="15" placeholder="W" keyboardType="numeric" />
                  <Text style={{ color: '#cbd5e1' }}>×</Text>
                  <TextInput style={styles.dimInput} defaultValue="10" placeholder="H" keyboardType="numeric" />
                </View>
              </View>
            )}

            {/* STEP 2: ADDRESSES */}
            {step === 2 && (
              <View>
                <View style={styles.addrCard}>
                  <View style={styles.addrHeader}>
                    <Text style={styles.addrTag}>PICKUP FROM</Text>
                    <TouchableOpacity onPress={() => alert('Change pickup address')}>
                      <Text style={styles.changeLink}>Change</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.addrMain}>{pickupAddr}</Text>
                </View>

                <View style={styles.addrCard}>
                  <View style={styles.addrHeader}>
                    <Text style={styles.addrTag}>DELIVER TO</Text>
                    <TouchableOpacity onPress={() => alert('Change delivery address')}>
                      <Text style={styles.changeLink}>Change</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.addrMain}>{destAddr}</Text>
                </View>

                <Text style={styles.sectionHeading}>Special Courier Instructions</Text>
                <TextInput
                  style={styles.instrInput}
                  value={instructions}
                  onChangeText={setInstructions}
                  multiline
                  placeholder="e.g. Leave package with security guard..."
                />
              </View>
            )}

            {/* STEP 3: PAYMENT */}
            {step === 3 && (
              <View>
                <Text style={styles.sectionHeading}>Choose Payment Method</Text>

                {[
                  { id: 'wallet', title: 'SwiftDrop Wallet', sub: 'Balance: $45.00', icon: '⚡' },
                  { id: 'card', title: 'Credit / Debit Card', sub: 'Visa ending in 4242', icon: '💳' },
                  { id: 'cod', title: 'Cash on Delivery (COD)', sub: 'Pay rider in cash', icon: '💵' },
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

                {/* Price Breakdown */}
                <View style={styles.pricingSummary}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Base Delivery Fee</Text>
                    <Text style={styles.priceVal}>$8.50</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Weight Surcharge ({weight.toFixed(1)}kg)</Text>
                    <Text style={styles.priceVal}>$1.50</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: Colors.primary }]}>Promo Voucher (SWIFT20)</Text>
                    <Text style={[styles.priceVal, { color: Colors.primary }]}>-$1.00</Text>
                  </View>
                  <View style={[styles.priceRow, styles.priceRowTotal]}>
                    <Text style={styles.totalLabel}>TOTAL</Text>
                    <Text style={styles.totalVal}>$9.00</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Action CTA */}
          <TouchableOpacity style={styles.ctaButton} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.ctaButtonText}>
              {step === 1 && 'Next: Pickup & Address →'}
              {step === 2 && 'Continue to Payment →'}
              {step === 3 && 'Pay Now & Dispatch ($9.00) ✓'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: '90%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 16,
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
    maxHeight: 400,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    marginTop: 6,
  },
  pkgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  pkgCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  pkgCardActive: {
    backgroundColor: '#fff7ed',
    borderColor: Colors.primary,
  },
  pkgCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  pkgCardTitleActive: {
    color: Colors.primary,
  },
  pkgCardSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    borderRadius: 18,
    marginBottom: 16,
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
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dimInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 10,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginHorizontal: 4,
  },
  addrCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  addrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  addrTag: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
  },
  changeLink: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  addrMain: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  instrInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    fontSize: 12,
    color: '#0f172a',
    height: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  payRowActive: {
    backgroundColor: '#fff7ed',
    borderColor: Colors.primary,
  },
  payTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  paySub: {
    fontSize: 11,
    color: '#94a3b8',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  pricingSummary: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  priceRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 6,
    paddingTop: 6,
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
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 8,
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
});
