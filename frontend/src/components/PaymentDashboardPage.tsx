import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { animate } from "animejs";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  MailCheck,
  MapPin,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { formatPHP } from "../data/shoeCatalog";
import type { BasketItem } from "./BasketDrawer";
import type {
  AppUser,
  OrderRecord,
  PaymentMethodType,
  ShippingAddressRecord,
} from "../services/api";

interface PaymentDashboardPageProps {
  user: AppUser;
  basketItems: BasketItem[];
  onBackToShop: () => void;
  onViewMyOrders: () => void;
  onSubmitOrder: (payload: {
    paymentMethod: PaymentMethodType;
    shippingAddress: ShippingAddressRecord;
  }) => Promise<OrderRecord>;
}

export function PaymentDashboardPage({
  user,
  basketItems,
  onBackToShop,
  onViewMyOrders,
  onSubmitOrder,
}: PaymentDashboardPageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const qrBoxRef = useRef<HTMLDivElement | null>(null);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodType>("COD");

  // Delivery Address Fields
  const [fullName, setFullName] = useState(user.username);
  const [phone, setPhone] = useState("+63 917 555 0143");
  const [street, setStreet] = useState("24 Katipunan Ave, Loyola Heights");
  const [city, setCity] = useState("Quezon City");
  const [province, setProvince] = useState("Metro Manila");
  const [postalCode, setPostalCode] = useState("1108");

  // Debit / Credit Card Fields
  const [cardName, setCardName] = useState(user.username.toUpperCase());
  const [cardNumber, setCardNumber] = useState("4532 •••• •••• 8891");
  const [cardExpiry, setCardExpiry] = useState("08/29");
  const [cardCvv, setCardCvv] = useState("842");

  // E-Wallet QR Step State
  const [showEWalletQr, setShowEWalletQr] = useState(false);
  const [qrImageError, setQrImageError] = useState(false);

  // Completed Order Receipt State
  const [completedOrder, setCompletedOrder] = useState<OrderRecord | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = basketItems.reduce(
    (sum, item) => sum + item.shoe.price * item.quantity,
    0
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (containerRef.current) {
      animate(containerRef.current, {
        opacity: [0, 1],
        translateY: [24, 0],
        duration: 600,
        ease: "outExpo",
      });
    }
  }, []);

  useEffect(() => {
    if (showEWalletQr && qrBoxRef.current) {
      animate(qrBoxRef.current, {
        scale: [0.9, 1],
        opacity: [0, 1],
        duration: 420,
        ease: "outBack(1.5)",
      });
    }
  }, [showEWalletQr]);

  const handlePrimaryFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (basketItems.length === 0) return;

    // For E-Wallet: first confirm address and display QR Code
    if (paymentMethod === "E-Wallet" && !showEWalletQr) {
      setShowEWalletQr(true);
      return;
    }

    // For COD, Debit/Credit Card, or Confirmed E-Wallet QR: finalize order
    setIsProcessing(true);
    try {
      const order = await onSubmitOrder({
        paymentMethod,
        shippingAddress: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          street: street.trim(),
          city: city.trim(),
          province: province.trim(),
          postalCode: postalCode.trim(),
        },
      });
      setCompletedOrder(order);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- POST-PAYMENT CONFIRMATION & EMAIL NOTIFICATION SCREEN ---
  if (completedOrder) {
    return (
      <section className="relative min-h-screen overflow-hidden bg-[#070709] pt-28 pb-20 text-white">
        <div className="mx-auto max-w-2xl px-6">
          <div className="rounded-3xl border border-emerald-400/30 bg-white/[0.05] p-8 text-center shadow-2xl backdrop-blur-xl sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <span className="mt-4 inline-block rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-xs font-bold tracking-wider text-emerald-300 uppercase">
              Order &amp; Payment Confirmed
            </span>

            <h1 className="font-sport mt-3 text-3xl tracking-wide text-white uppercase italic sm:text-4xl">
              THANK YOU FOR YOUR ORDER!
            </h1>

            <p className="font-mono-tabular mt-1 text-sm font-semibold text-amber-300">
              Receipt ID: {completedOrder.orderNumber} · Method:{" "}
              {completedOrder.paymentMethod}
            </p>

            {/* Email Confirmation Notification Banner */}
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-400/35 bg-amber-400/10 p-4 text-left">
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div className="text-xs leading-relaxed text-zinc-200">
                <p className="font-bold text-white">
                  Email Confirmation Dispatched
                </p>
                <p className="mt-0.5">
                  You will receive an official order confirmation email, digital
                  receipt, and live shipment tracking updates at{" "}
                  <strong className="text-amber-300">
                    {completedOrder.userEmail}
                  </strong>
                  .
                </p>
              </div>
            </div>

            {/* Itemized Summary */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/45 p-5 text-left">
              <p className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Purchased Items (Stock Deducted in Database)
              </p>
              <div className="mt-3 divide-y divide-white/10">
                {completedOrder.items.map((item, idx) => (
                  <div
                    key={`${item.shoeId}-${idx}`}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {item.shoeName}
                      </p>
                      <p className="text-zinc-400">
                        Size: {item.size} × {item.quantity}
                      </p>
                    </div>
                    <span className="font-mono-tabular font-bold text-white">
                      {formatPHP(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3 text-sm font-bold">
                <span>Total Paid</span>
                <span className="font-mono-tabular text-amber-300">
                  {formatPHP(completedOrder.totalAmount)}
                </span>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onViewMyOrders}
                className="cursor-pointer rounded-full bg-white px-7 py-3 text-xs font-bold tracking-[0.16em] text-black uppercase transition hover:bg-amber-300"
              >
                View My Orders
              </button>
              <button
                type="button"
                onClick={onBackToShop}
                className="cursor-pointer rounded-full border border-white/25 bg-white/[0.04] px-7 py-3 text-xs font-bold tracking-[0.16em] text-white uppercase transition hover:border-white"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#070709] pt-28 pb-20 text-white">
      {/* Ambient Sporty Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-12 left-[10%] h-96 w-96 rounded-full bg-amber-500/15 blur-[130px]" />
        <div className="absolute right-[10%] bottom-10 h-96 w-96 rounded-full bg-blue-500/15 blur-[130px]" />
      </div>

      <div
        ref={containerRef}
        className="relative z-10 mx-auto max-w-6xl px-6 md:px-10"
      >
        <button
          type="button"
          onClick={onBackToShop}
          className="mb-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white hover:bg-white hover:text-black"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Storefront</span>
        </button>

        <h1 className="font-sport text-3xl tracking-wide text-white uppercase italic sm:text-4xl">
          PAYMENT &amp; CHECKOUT <span className="text-amber-300">DASHBOARD</span>
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Choose Cash on Delivery (COD), E-Wallet (QR Code), or Debit/Credit
          Card to complete your order.
        </p>

        {basketItems.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-white/15 bg-white/[0.04] p-10 text-center">
            <p className="text-base font-medium text-zinc-200">
              Your basket is empty.
            </p>
            <button
              type="button"
              onClick={onBackToShop}
              className="mt-4 cursor-pointer rounded-full bg-white px-7 py-3 text-xs font-bold tracking-widest text-black uppercase hover:bg-amber-300"
            >
              Browse Shoes
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* LEFT COLUMN: Payment Method Selector, Delivery Address & Payment Details */}
            <form
              onSubmit={handlePrimaryFormSubmit}
              className="space-y-6 lg:col-span-7"
            >
              {/* 1. Choose Payment Method */}
              <div className="rounded-3xl border border-white/15 bg-white/[0.04] p-6 backdrop-blur-xl">
                <h2 className="font-sport text-lg tracking-wide text-white uppercase italic">
                  1. SELECT PAYMENT METHOD
                </h2>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("COD");
                      setShowEWalletQr(false);
                    }}
                    className={`flex cursor-pointer flex-col items-start rounded-2xl border p-4 text-left transition ${
                      paymentMethod === "COD"
                        ? "border-amber-400 bg-amber-400/15 text-white"
                        : "border-white/15 bg-black/40 text-zinc-300 hover:border-white/40"
                    }`}
                  >
                    <Banknote className="h-5 w-5 text-amber-300" />
                    <span className="mt-2 text-sm font-bold">Cash (COD)</span>
                    <span className="mt-0.5 text-[11px] text-zinc-400">
                      Address only · Pay upon delivery
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("E-Wallet");
                      setShowEWalletQr(false);
                    }}
                    className={`flex cursor-pointer flex-col items-start rounded-2xl border p-4 text-left transition ${
                      paymentMethod === "E-Wallet"
                        ? "border-amber-400 bg-amber-400/15 text-white"
                        : "border-white/15 bg-black/40 text-zinc-300 hover:border-white/40"
                    }`}
                  >
                    <QrCode className="h-5 w-5 text-amber-300" />
                    <span className="mt-2 text-sm font-bold">E-Wallet</span>
                    <span className="mt-0.5 text-[11px] text-zinc-400">
                      Address + Scan QR Code
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("Debit/Credit Card");
                      setShowEWalletQr(false);
                    }}
                    className={`flex cursor-pointer flex-col items-start rounded-2xl border p-4 text-left transition ${
                      paymentMethod === "Debit/Credit Card"
                        ? "border-amber-400 bg-amber-400/15 text-white"
                        : "border-white/15 bg-black/40 text-zinc-300 hover:border-white/40"
                    }`}
                  >
                    <CreditCard className="h-5 w-5 text-amber-300" />
                    <span className="mt-2 text-sm font-bold">
                      Debit / Credit Card
                    </span>
                    <span className="mt-0.5 text-[11px] text-zinc-400">
                      Card details + Address
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Delivery Address (Required for ALL 3 methods: COD, E-Wallet, Debit/Credit Card) */}
              <div className="rounded-3xl border border-white/15 bg-white/[0.04] p-6 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-400" />
                  <h2 className="font-sport text-lg tracking-wide text-white uppercase italic">
                    2. DELIVERY ADDRESS
                  </h2>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">
                      Recipient Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-300">
                      House No., Street &amp; Barangay
                    </label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">
                      City / Municipality
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300">
                        Province
                      </label>
                      <input
                        type="text"
                        required
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        required
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3A. DEBIT / CREDIT CARD DETAILS (Only when Debit/Credit Card is chosen — no QR code) */}
              {paymentMethod === "Debit/Credit Card" && (
                <div className="rounded-3xl border border-white/15 bg-white/[0.04] p-6 backdrop-blur-xl">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-amber-400" />
                    <h2 className="font-sport text-lg tracking-wide text-white uppercase italic">
                      3. DEBIT / CREDIT CARD DETAILS
                    </h2>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-zinc-300">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        required
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-zinc-300">
                        Card Number
                      </label>
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="font-mono-tabular mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300">
                        Expiry Date (MM/YY)
                      </label>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="font-mono-tabular mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300">
                        CVV
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="font-mono-tabular mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3B. E-WALLET QR CODE STEP (Shows once address is confirmed for E-Wallet) */}
              {paymentMethod === "E-Wallet" && showEWalletQr && (
                <div
                  ref={qrBoxRef}
                  className="rounded-3xl border border-amber-400/40 bg-white p-6 text-center text-[#111111] shadow-2xl"
                >
                  <span className="inline-block rounded-full bg-amber-100 px-3.5 py-1 text-xs font-bold text-amber-900">
                    SOLE PURPOSE E-WALLET QRPH
                  </span>
                  <h3 className="font-sport mt-2 text-2xl uppercase italic">
                    SCAN QR TO PAY {formatPHP(subtotal)}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-600">
                    Scan with GCash, Maya, or any QRPh-supported banking app,
                    then click Complete Payment below.
                  </p>

                  <div className="my-5 flex justify-center">
                    {!qrImageError ? (
                      <img
                        src="/qr-payment.png"
                        alt="E-Wallet QR Code"
                        onError={() => setQrImageError(true)}
                        className="h-56 w-56 rounded-2xl border-2 border-zinc-200 object-contain p-2 shadow-md"
                      />
                    ) : (
                      /* Built-in High-Contrast Stylized QR Code Fallback (until /qr-payment.png is added) */
                      <div className="flex h-56 w-56 flex-col items-center justify-center rounded-2xl border-2 border-zinc-900 bg-white p-4 shadow-md">
                        <svg
                          viewBox="0 0 120 120"
                          className="h-44 w-44 fill-[#111111]"
                        >
                          {/* Top-Left Finder Pattern */}
                          <path d="M10 10h30v30H10zM15 15v20h20V15zM20 20h10v10H20z" />
                          {/* Top-Right Finder Pattern */}
                          <path d="M80 10h30v30H80zM85 15v20h20V15zM90 20h10v10H90z" />
                          {/* Bottom-Left Finder Pattern */}
                          <path d="M10 80h30v30H10zM15 85v20h20V85zM20 90h10v10H20z" />
                          {/* QR Data Modules */}
                          <rect x="46" y="12" width="6" height="6" />
                          <rect x="58" y="12" width="12" height="6" />
                          <rect x="46" y="24" width="12" height="6" />
                          <rect x="64" y="24" width="6" height="12" />
                          <rect x="46" y="42" width="8" height="8" />
                          <rect x="58" y="42" width="14" height="8" />
                          <rect x="14" y="48" width="12" height="6" />
                          <rect x="32" y="48" width="8" height="14" />
                          <rect x="48" y="54" width="16" height="16" />
                          <rect x="70" y="50" width="8" height="12" />
                          <rect x="84" y="46" width="10" height="8" />
                          <rect x="98" y="46" width="12" height="12" />
                          <rect x="14" y="62" width="10" height="10" />
                          <rect x="46" y="76" width="12" height="8" />
                          <rect x="64" y="72" width="10" height="16" />
                          <rect x="82" y="66" width="14" height="10" />
                          <rect x="100" y="66" width="10" height="16" />
                          <rect x="46" y="92" width="16" height="16" />
                          <rect x="68" y="96" width="12" height="12" />
                          <rect x="86" y="84" width="22" height="10" />
                          <rect x="86" y="100" width="12" height="8" />
                          <rect x="102" y="98" width="8" height="10" />
                        </svg>
                        <span className="font-mono-tabular mt-1 text-[10px] font-bold text-zinc-500">
                          MERCHANT: SOLE PURPOSE PH
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 py-4 text-xs font-bold tracking-[0.2em] text-black uppercase shadow-lg transition hover:brightness-110 disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>
                  {isProcessing
                    ? "Processing Payment..."
                    : paymentMethod === "E-Wallet" && !showEWalletQr
                      ? "Confirm Address & Generate E-Wallet QR Code"
                      : paymentMethod === "E-Wallet" && showEWalletQr
                        ? `Complete E-Wallet Payment · ${formatPHP(subtotal)}`
                        : paymentMethod === "COD"
                          ? `Confirm Cash on Delivery Order · ${formatPHP(subtotal)}`
                          : `Pay Now with Debit / Credit Card · ${formatPHP(subtotal)}`}
                </span>
              </button>
            </form>

            {/* RIGHT COLUMN: Order Summary */}
            <div className="lg:col-span-5">
              <div className="sticky top-28 rounded-3xl border border-white/15 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
                <h2 className="font-sport text-xl tracking-wide text-white uppercase italic">
                  ORDER SUMMARY
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Confirmation will be emailed to{" "}
                  <span className="text-amber-300">{user.email}</span>
                </p>

                <div className="mt-5 max-h-[45vh] space-y-3 overflow-y-auto pr-1">
                  {basketItems.map((item) => (
                    <div
                      key={`${item.shoe.id}-${item.size}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 p-3"
                    >
                      <img
                        src={item.shoe.angles.pairAngle}
                        alt={item.shoe.name}
                        className="h-14 w-14 rounded-xl bg-[#F5F5F5] object-contain p-1"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {item.shoe.name}
                        </p>
                        <p className="text-xs text-zinc-400">
                          Size: {item.size} · Qty: {item.quantity}
                        </p>
                      </div>
                      <span className="font-mono-tabular text-xs font-bold text-amber-300">
                        {formatPHP(item.shoe.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-2 border-t border-white/15 pt-4 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span className="font-mono-tabular text-white">
                      {formatPHP(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Standard PH Shipping</span>
                    <span className="font-semibold text-emerald-400">FREE</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-3 text-base font-bold text-white">
                    <span>Total Due</span>
                    <span className="font-mono-tabular text-amber-300">
                      {formatPHP(subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
