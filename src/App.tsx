import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence} from "framer-motion";
import bgImage from "./assets/background.jpg";
import pfpImage from "./assets/pfp.jpg";



const InfoIcon = () => {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative inline-block ml-2"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="size-4 rounded-full border border-white/20 text-xs text-zinc-400 grid place-items-center cursor-default">
        i
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            className="absolute left-5 top-1/2 -translate-y-1/2 z-50 w-52 rounded-md border border-white/10 bg-black/80 p-2 text-xs text-zinc-200 shadow-lg"
          >
            No one will know your real name, feel free to confess, or just bully me.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
// ---------- Error Boundary ----------
class ErrorBoundary extends React.Component<React.PropsWithChildren> {
  state = { hasError: false, error: null as unknown as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error("App Error:", error, errorInfo);
  }
  render() {
    if ((this.state as any).hasError) {
      return (
        <div className="min-h-screen bg-red-900 text-white p-8">
          <h1 className="text-2xl mb-4">Something went wrong!</h1>
          <pre className="bg-black p-4 rounded text-sm overflow-auto">
            {(this.state as any).error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------- Firebase ----------
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  increment,
  serverTimestamp,
  type Firestore,
  collection,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";

// --------- Mock profile config ----------
const config = {
  name: "Letrongvang",
  tagline: "those who don't know dark · don't value the lights",
  contact: "discord.gg/letrongv4ng",
  Ages: 19,
  status: "Currently Busy",
  accent: "#cdcdcd6e",
  avatar: pfpImage,
  avatarFrame: null,
  background: bgImage,
  badges: [],
  stats: {
    "University:": "F right before the PT",
    "Status:": "67% Single and 33% Nicotine",
    "Inventory:": "Marlboro and one lighter",
  },
  group: {
    name: "should we meet?",
    members: "no",
    icon: "O",
  },
  links: [
    { label: "GitHub", href: "https://github.com/letrongv4ng" },
    { label: "Instagram", href: "https://www.instagram.com/lil.haize" },
  ],
};

// ---------- Env Firebase ----------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

// Singleton
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

function ensureFirebase(): { app: FirebaseApp; db: Firestore; auth: Auth } {
  if (!app) {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error("Missing Firebase configuration");
    }
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  }
  // non-null assert vì đã init
  return { app: app!, db: db!, auth: auth! };
}

// ---------- Const ----------
const VISITOR_DOC_PATH = "stats/visitors";
const MESSAGES_COL = "messages";
;

// ---------- UI Bits ----------
type TiltProps = {
  children: React.ReactNode;
  className?: string;
  max?: number;
  scale?: number;
};
const Tilt: React.FC<TiltProps> = ({ children, className = "", max = 15, scale = 1.03 }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const s = useMotionValue(1);
  const spring = { stiffness: 180, damping: 18, mass: 0.7 };
  const rxS = useSpring(rx, spring);
  const ryS = useSpring(ry, spring);
  const sS = useSpring(s, spring);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rX = (0.5 - py) * (max * 2);
    const rY = (px - 0.5) * (max * 2);
    rx.set(rX);
    ry.set(rY);
    s.set(scale);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
    s.set(1);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rxS, rotateY: ryS, scale: sS, transformStyle: "preserve-3d", perspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const StatRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-1.5 text-sm text-zinc-300/90">
    <span className="tracking-wide">{label}</span>
    <span className="font-semibold text-zinc-100">{value}</span>
  </div>
);

type BadgeItem = { emoji?: string; label?: string; src?: string; big?: boolean };

const Badge: React.FC<{ item: BadgeItem }> = ({ item }) => {
  const baseSize = item.big ? "size-24" : "size-8"; // 3x
  const innerSize = item.big ? "size-16" : "size-5";

  const inner = item.src ? (
    <img alt={item.label || "badge"} src={item.src} className={`${innerSize} object-contain`} />
  ) : (
    <span className="text-lg">{item.emoji}</span>
  );

  return (
    <motion.div
      title={item.label}
      whileHover={{ y: -2, scale: item.big ? 1.02 : 1.06 }}
      className={`${baseSize} shrink-0 grid place-items-center rounded-md border border-white/10 bg-white/5`}
    >
      {inner}
    </motion.div>
  );
};

const Header: React.FC = () => (
  <div className="flex items-start gap-4">
    <Tilt className="relative">
      <div className="relative size-36 rounded-lg overflow-hidden border border-white/15 shadow-lg bg-black/40">
        <motion.img
          src={config.avatar}
          alt="avatar"
          className="size-full object-cover"
          initial={{ filter: "grayscale(100%) contrast(120%)" }}
          whileHover={{ filter: "grayscale(0%) contrast(100%)" }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </Tilt>

    <div className="flex-1">
      <h1 className="text-7xl font-semibold tracking-tight text-zinc-100 font-cormorant">
        {config.name}
      </h1>
      <p className="mt-1 text-sm text-zinc-300/80 font-shippori">{config.tagline}</p>
      <p className="text-xs text-zinc-400/80 mt-0.5 font-shippori">{config.contact}</p>
    </div>

    <div className="px-3 py-1 rounded-full border border-white/15 bg-black/30 backdrop-blur text-sm text-zinc-200">
      <span className="opacity-80">Ages:</span>
      <span className="ml-2 font-semibold" style={{ color: config.accent }}>
        {config.Ages}
      </span>
    </div>
  </div>
);

// ---------- Sign Popover ----------
type SignPopoverProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; message: string }) => Promise<void>;
  submitting: boolean;
  error?: string | null;
};

const SignPopover: React.FC<SignPopoverProps> = ({ open, onClose, onSubmit, submitting, error }) => {
  const [name, setName] = useState("");
  const [message, setmessage] = useState("");
  const canSubmit = name.trim().length >= 2;

  const submit = async () => {
    if (!canSubmit || submitting) return;
    await onSubmit({ name: name.trim(), message: message.trim() });
    setName(""); setmessage("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="relative z-[61] w-[min(92vw,420px)] rounded-2xl border border-white/12 bg-zinc-900/95 p-5 shadow-2xl"
          >
            <div className="text-lg font-semibold text-zinc-100">Send me a message?</div>
            <div className="mt-1 text-xs text-zinc-400">I'll reply to it, or not duh.</div>

            <div className="mt-4 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="your name"
                className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-white/20"
              />
              <div className="flex items-center gap-2">
                <input
                  value={message}
                  onChange={(e) => setmessage(e.target.value)}
                  placeholder="you love me?"
                  className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-white/20"
                />
                <InfoIcon />
              </div>
              {error && <div className="text-xs text-red-400">{error}</div>}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border border-white/10 bg-white/5 hover:bg-white/10">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!canSubmit || submitting}
                className="px-3 py-1.5 text-sm rounded-md border border-white/10 bg-white/10 hover:bg-white/20 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Sign"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ---------- Profile Panel ----------
type ProfilePanelProps = {
  visitorCount: number | null;
  firebaseError: string | null;
  signing: boolean;
  signed: boolean;
  onSign: () => void; // chỉ mở popover
};

const ProfilePanel: React.FC<ProfilePanelProps> = ({ visitorCount, signing, signed, onSign }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-7">
    <Header />
    <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Showcase */}
      <div className="md:col-span-2">
        <Tilt max={4} scale={1.01}>
          <div className="aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/10 bg-black/40">
            <img src={config.background} alt="showcase" className="size-full object-cover" />
          </div>
        </Tilt>
      </div>

      {/* Sidebar */}
      <div>
        <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-300/90">{config.status}</div>
        <div className="mt-4 grid grid-cols-4 gap-2">{config.badges.map((b, i) => <Badge key={i} item={b} />)}</div>

        {/* Depth border wrapper for stats box (minimal change) */}
        <div className="mt-4 relative rounded-lg p-[1px] bg-gradient-to-r from-white/10 via-white/5 to-transparent">
          <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">
            {Object.entries(config.stats).map(([k, v]) => <StatRow key={k} label={k} value={v as React.ReactNode} />)}
            <StatRow label="People who's curious:" value={visitorCount !== null ? visitorCount.toLocaleString() : "—"} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="size-9 grid place-items-center rounded-md border border-white/10 bg-white/5 font-bold">{config.group.icon}</div>
          <div className="text-sm text-zinc-200">
            <div className="font-semibold">{config.group.name}</div>
            <div className="text-zinc-400 text-xs">{config.group.members}</div>
          </div>
        </div>
      </div>
    </div>

    <div className="mt-6 flex flex-wrap gap-3">
      {config.links.map((l) => (
        <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-sm rounded-md border border-white/10 bg-white/5 hover:bg-white/10 transition">
          {l.label}
        </a>
      ))}
      <button onClick={onSign} disabled={signing || signed} className="px-3 py-1.5 text-sm rounded-md border border-white/10 bg-white/10 hover:bg-white/20 transition disabled:opacity-60">
        {signed ? "Signed ✓" : "Sign"}
      </button>
    </div>
  </motion.div>
);
// ---------- Luxe Background----------
function LuxeBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      {/* ẢNH NỀN */}
      <img
        src={config.background}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        decoding="async"
        loading="eager"
        style={{ filter: "contrast(1.5) brightness(0.6)" }} 
      />

      {/* breathing  */}
      <div
        className="absolute inset-0"
        style={{
          animation: "breathe 18s ease-in-out infinite",
          willChange: "transform, opacity",
          background:
            "radial-gradient(60% 30% at 50% 20%, rgba(255,255,255,0.3), transparent)"
        }}
      />
      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 120%, transparent, rgba(0,0,0,1))"
        }}
      />

      {/* film grain */}
      <div
        className="absolute inset-0 opacity-[1] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.25%22 numOctaves=%222%22 /></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.5%22/></svg>')"
        }}
      />
    </div>
  );
}


// ---------- App ----------
function App() {
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [signed, setSigned] = useState<boolean>(false);
  const [signOpen, setSignOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [signError, setSignError] = useState<string | null>(null);

  // Auto +1 visitor (throttle 2h theo localStorage)
  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        const { db, auth } = ensureFirebase();
        try { await signInAnonymously(auth); } catch {}

        const ref = doc(db, VISITOR_DOC_PATH);

        const VISITOR_KEY = "visited_at_v1";
        const now = Date.now();
        const last = Number(localStorage.getItem(VISITOR_KEY) || "0");
        const shouldCount = now - last > 2 * 60 * 60 * 1000;

        if (shouldCount) {
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            // lần đầu tạo doc
            await setDoc(ref, {
              count: 1,
              createdAt: serverTimestamp(),
            });
          } else {
            // đã tồn tại, chỉ cần tăng 1
            await updateDoc(ref, {
              count: increment(1),
              createdAt: serverTimestamp(),
            });
          }
          localStorage.setItem(VISITOR_KEY, String(now));
        }

        // Live subscribe visitors
        unsub = onSnapshot(
          ref,
          (snap) => setVisitorCount(snap.data()?.count ?? 0),
          () => setFirebaseError("Connection failed")
        );
      } catch (e: any) {
        setFirebaseError(e?.message || "Init failed");
      }
    })();

    return () => {
      if (unsub) unsub();
    };
  }, []);


  // Submit signature (name + message)
  const handleSignSubmit = async ({ name, message }: { name: string; message: string }) => {
    setSubmitting(true);
    setSignError(null);
    try {
      const { db } = ensureFirebase(); // không cần auth ở đây

      await addDoc(collection(db, MESSAGES_COL), {
        name,
        message,                 
        createdAt: serverTimestamp(),
        ua: navigator.userAgent, 
      });


      setSigned(true);
      setSignOpen(false);
    } catch (e: any) {
      setSignError(e?.message || "Failed to message");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <ErrorBoundary>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="min-h-screen text-zinc-100">
        {/* Visitors pill góc phải */}
        <motion.div
          className="fixed right-4 top-4 z-50 select-none"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/40 backdrop-blur-xl px-4 py-2 shadow-lg">
            <div className="size-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium text-zinc-200">
              {visitorCount !== null ? (
                <span>
                  <span className="text-zinc-400">Visitors:</span>
                  <span className="ml-1 tabular-nums" style={{ color: config.accent }}>
                    {visitorCount.toLocaleString()}
                  </span>
                </span>
              ) : (
                <span className="text-zinc-400">Loading...</span>
              )}
            </span>
          </div>
        </motion.div>

        <LuxeBackground />

        {/* Popover message */}
        <SignPopover
          open={signOpen}
          onClose={() => setSignOpen(false)}
          onSubmit={handleSignSubmit}
          submitting={submitting}
          error={signError}
        />

        <main className="mx-auto max-w-6xl px-5 py-10">
          <ProfilePanel
            visitorCount={visitorCount}
            firebaseError={firebaseError}
            signing={submitting}
            signed={signed}
            onSign={() => setSignOpen(true)} // chỉ mở popover, không +1 visitors
          />
        </main>
      </motion.div>
    </ErrorBoundary>
  );
}

export default App;
