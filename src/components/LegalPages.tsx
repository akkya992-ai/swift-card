import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  FileText, 
  RefreshCw, 
  User, 
  MapPin, 
  Phone, 
  History, 
  Bell, 
  Compass, 
  Trash2, 
  Mail, 
  ExternalLink 
} from 'lucide-react';

interface LegalPagesProps {
  initialTab?: 'privacy' | 'terms' | 'refund';
  onBack?: () => void;
}

export default function LegalPages({ initialTab = 'privacy', onBack }: LegalPagesProps) {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'refund'>(initialTab);

  const tabs = [
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { id: 'terms', label: 'Terms & Conditions', icon: FileText, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { id: 'refund', label: 'Refund & Cancellation', icon: RefreshCw, color: 'text-amber-600 bg-amber-50 border-amber-100' }
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans leading-relaxed pb-12">
      {/* Top Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm px-4 py-4 md:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500 hover:text-slate-900 cursor-pointer"
                aria-label="Go Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="bg-emerald-500 text-white rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-tight uppercase">SwiftCart</span>
                <h1 className="font-display font-black text-lg text-slate-900 tracking-tight">Legal Center</h1>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider">COMPLIANCE & DATA PROTECTION NODE</p>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono text-right hidden sm:block">
            <span>Last Updated: June 2026</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        {/* Interactive Sidebar Tabs - Horizontal in mobile, unified control row */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200/60 shadow-3xs flex flex-wrap gap-1.5 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'bg-white hover:bg-slate-50 text-slate-600 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Box */}
        <div className="bg-white rounded-[32px] border border-slate-205/60 border-slate-200 p-6 md:p-8 shadow-sm text-left">
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              {/* Animated Header Callout */}
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-wider mb-2 font-mono">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Privacy Policy & User Consent</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">We Secure User Identity Data</h2>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-sans font-medium">
                  At SwiftCart, your digital privacy is our operational mandate. This Policy declares how we collect, map, process, protect, and purge personal data in full compliance with the Google Play Developer Distribution Agreement and legal privacy standards.
                </p>
              </div>

              {/* Data Inventory Grid for Google Play审查 */}
              <div className="space-y-3">
                <h3 className="font-black text-xs text-slate-400 uppercase tracking-wider font-mono">GOOGLE PLAY MANDATED DATA CODES</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Item 1 */}
                  <div className="flex gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <User className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800">User Accounts & Metadata</h4>
                      <p className="text-[10.5px] text-slate-500 mt-1 leading-normal">
                        <strong>Collected:</strong> Your account profile name, secure email verification addresses, unique system UID keys, and passwords.
                      </p>
                      <p className="text-[10px] text-emerald-700 font-bold mt-1.5">Purpose: Session registration, order assignment, and account syncing.</p>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="flex gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <Phone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800">Phone Contact Numbers</h4>
                      <p className="text-[10.5px] text-slate-500 mt-1 leading-normal">
                        <strong>Collected:</strong> Mobile phone contact structures logged during registration or verification handshake phases.
                      </p>
                      <p className="text-[10px] text-emerald-700 font-bold mt-1.5">Purpose: Secure OTP authentication, rider SMS dispatch, and priority customer support.</p>
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div className="flex gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <MapPin className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800">Physical Delivery Addresses</h4>
                      <p className="text-[10.5px] text-slate-500 mt-1 leading-normal">
                        <strong>Collected:</strong> User-provided shipping destinations, building labels, landmark parameters, and street logs.
                      </p>
                      <p className="text-[10px] text-emerald-700 font-bold mt-1.5">Purpose: Physical courier package routing, nearest outlet mapping, and tax calculations.</p>
                    </div>
                  </div>

                  {/* Item 4 */}
                  <div className="flex gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <Compass className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800">Active Location Data (GPS)</h4>
                      <p className="text-[10.5px] text-slate-500 mt-1 leading-normal">
                        <strong>Collected:</strong> Precise geographical location coordinates (GPS, cell signal) when active on delivery tracking screens.
                      </p>
                      <p className="text-[10px] text-rose-700 font-bold mt-1.5">Purpose: Real-time foreground tracking of courier transits during active orders only.</p>
                    </div>
                  </div>

                  {/* Item 5 */}
                  <div className="flex gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <History className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800">Complete Purchase Order History</h4>
                      <p className="text-[10.5px] text-slate-500 mt-1 leading-normal">
                        <strong>Collected:</strong> Historic ledger records of item prices, cart sub-categories, billing receipts, transacting nodes, and driver payouts.
                      </p>
                      <p className="text-[10px] text-emerald-700 font-bold mt-1.5">Purpose: Wallet ledger statements, refund verification, and personalized recommendations.</p>
                    </div>
                  </div>

                  {/* Item 6 */}
                  <div className="flex gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <Bell className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800">Notifications & Device Tokens</h4>
                      <p className="text-[10.5px] text-slate-500 mt-1 leading-normal">
                        <strong>Collected:</strong> Firebase Cloud Messaging (FCM) push notification tokens mapped to individual accounts.
                      </p>
                      <p className="text-[10px] text-emerald-700 font-bold mt-1.5">Purpose: Real-time packaging updates, courier dispatch banners, and promotional discount sync.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* In-depth privacy chapters */}
              <div className="space-y-4 pt-4 border-t border-slate-100 text-xs text-slate-650 leading-relaxed font-sans">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-1">1. Active Proximity & Foreground Tracking Policy</h4>
                  <p>
                    SwiftCart operates exclusively on a foreground-only location tracking model (using active browser/app sessions during your use). We do NOT request, collect, or store location coordinates in the background while the application is minimized or closed. Location access occurs only when the delivery tracing screen is actively displayed on your device and is used solely to verify proximity to the designated store and dropoff coordinates.
                  </p>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-1">2. Data Security & Storage Integrity</h4>
                  <p>
                    All personal data indices—including payment methods, addresses, phone parameters, and FCM registration channels—are fully encrypted in transit via industry-standard SSL protocols and safely persisted on secure database architectures. Dedicated access logs restrict coordinate reads to assigned delivery personnel during standard working transits only.
                  </p>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-1">3. Third-Party Sharing Rules</h4>
                  <p>
                    Your personal delivery data is shares strictly with authorized logistical nodes to assure correct cargo handover. We enforce zero data selling paradigms. External analytics channels used for evaluating runtime performance logs (e.g. Supabase, Firebase metrics channels) operate under strict compliance directives blocking identification sequences.
                  </p>
                </div>

                <div id="data-deletion-node" className="bg-[#FFFDF5] border border-amber-200/55 p-4.5 rounded-2xl space-y-2">
                  <h4 className="font-extrabold text-sm text-amber-900 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-amber-600" />
                    Right to Purge: Account and Data Deletion Protocol
                  </h4>
                  <p className="text-[11px] text-amber-800 font-medium">
                    In compliance with global data protection laws (GDPR, CCPA) and Google Play account deletion mandates:
                  </p>
                  <p className="text-[11.5px] text-slate-700 font-medium leading-relaxed">
                    You hold full rights to permanently purge your account profile, linked address list, transacting history ledger, and notification tokens from our live repositories at any time.
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                     To invoke this deletion, you can submit an explicit request to our designated privacy officer via email: <a href="mailto:akkya992@gmail.com" className="text-emerald-600 font-bold hover:underline">akkya992@gmail.com</a>. Our database system will securely purge all your primary metadata indices within 48 working hours, leaving only anonymous statistical order invoices for accounting tax purposes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-6">
              {/* Animated Header Callout */}
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2 text-blue-605 text-blue-605 text-blue-600 font-black text-xs uppercase tracking-wider mb-2 font-mono">
                  <FileText className="w-5 h-5" />
                  <span>Terms Of Service Agreement</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">Hyperlocal Service License Rules</h2>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-sans font-medium">
                  By instantiating, navigating, or transacting on the SwiftCart platform, you agree to comply with standard service guidelines. These terms govern user behavior, delivery protocols, and wallet escrow dynamics.
                </p>
              </div>

              {/* Terms terms details */}
              <div className="space-y-4 text-xs text-slate-650 leading-relaxed font-sans">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-1">1. Hyperlocal SLA Deliveries & Windows</h4>
                  <p>
                    SwiftCart establishes an 8-to-10 minute transit goal leveraging strategic local darkstores. By transacting, you acknowledge that delivery times remain estimated coordinates depending on environmental variables (weather constraints, traffic density signals, rider availability). Late arrival does not constitute an automatic monetary fine unless SLA conditions are explicitly violated.
                  </p>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-1">2. Account Responsibility & OTP Protocols</h4>
                  <p>
                    You are solely responsible for ensuring the confidentiality of your account login data, including OTP strings and registered phone channels. You agree to immediately alert our systems if any unauthorized access or data leak is suspected on your profile. Account sharing across separate geographical environments may trigger temporary suspension algorithms.
                  </p>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-1">3. Wallet Deposits & Escrow Settlements</h4>
                  <p>
                    Pre-funding your SwiftCart wallet constitutes a local deposit held securely to honor grocery acquisitions. Payments are settled in favor of store merchant nodes once the dynamic courier confirms successful delivery. You agree that standard chargeback attempts on correctly fulfilled orders represent platform abuse and may result in immediate profile termination.
                  </p>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-1">4. Prohibited Activities</h4>
                  <p>
                    Users are strictly forbidden from fabricating physical addresses, providing deactivated phone numbers during OTP handshakes, registering multiple synthetic profiles to harvest local promotional discount vouchers (e.g. "FAST50"), or harassing courier partners during active transit windows.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'refund' && (
            <div className="space-y-6">
              {/* Animated Header Callout */}
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2 text-amber-600 font-black text-xs uppercase tracking-wider mb-2 font-mono">
                  <RefreshCw className="w-5 h-5" />
                  <span>Refund & Cancellation Policy</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">Humble & Clear Settlement Rules</h2>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-sans font-medium">
                  We believe in keeping commerce absolutely friendly and honest. Since we deal in fresh garden produce, dairy products, and chilled cargos, our refund policies are built to protect local buyers instantly.
                </p>
              </div>

              {/* Refund policy points */}
              <div className="space-y-4 text-xs text-slate-655 text-slate-600 leading-relaxed font-sans">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-xl">🍏</span>
                    <h4 className="font-black text-xs text-slate-900">Perishables & Veggies</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Instant replacement or 100% wallet credit if items arrive damaged, stale, or moldy. No questions asked.
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-xl">🛵</span>
                    <h4 className="font-black text-xs text-slate-900">Cancellation Window</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Free cancellation within 60 seconds of placing order. Once packing initiates at the darkstore, cancellations draw ₹50 fee.
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-xl">⏱️</span>
                    <h4 className="font-black text-xs text-slate-900">SLA Breach</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      If instant cargo transit duration surpasses 30 minutes without environmental alerts, delivery fee is fully waived.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-1">1. How to Initiate a Claim</h4>
                  <p>
                    If any item in your organic basket fails your quality expectations, navigate to <strong>My Orders</strong>, select the specific dispatch ticket, and click the "Report Issue/Refund" button. Alternatively, upload a snapshot of the stale item and email it to <a href="mailto:akkya992@gmail.com" className="text-emerald-600 font-bold hover:underline">akkya992@gmail.com</a>. All valid claims are verified and credited within 2 hours.
                  </p>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-1">2. Payout Routing</h4>
                  <p>
                    Refund credits are by default returned instantly to your <strong>SwiftCart Digital Wallet Balance</strong>, available immediately for future checkouts. If requested by the customer, credits can be routed back to the original funding source (UPI, Credit Card) through Razorpay or Stripe, processing within 5-7 bank business days.
                  </p>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-1">3. Fraud Prevention Monitoring</h4>
                  <p>
                    To ensure fairness for organic growers, our fraud detection node logs item return rates. Profiles demonstrating repetitive refund requests across distinct addresses or phone IDs may trigger administrative review, resulting in potential limit caps on wallet cashbacks.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Support Callout Footnote */}
        <div className="mt-6 p-5 bg-slate-900 text-white rounded-[24px] border border-slate-800 text-center space-y-2 relative overflow-hidden">
          {/* Subtle decoration vector */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
          <h4 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center justify-center gap-1.5 font-mono">
            <span>🛡️</span> Institutional SwiftCart Trust Pledge
          </h4>
          <p className="text-[10.5px] text-slate-400 font-medium font-sans leading-relaxed max-w-xl mx-auto">
            Your personal customer registry parameters support your active delivery transits. We strictly comply with Google Play security baselines. For compliance requests or account purges, reach out through our official mail interface: <a href="mailto:akkya992@gmail.com" className="text-emerald-400 font-bold hover:underline font-mono">akkya992@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
