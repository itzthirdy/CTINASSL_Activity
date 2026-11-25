import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { animate } from "animejs";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Check,
  Database,
  DollarSign,
  Edit3,
  Package,
  Palette,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { playShoePresetAnimation } from "../animations/shoeAnimations";
import {
  ANIMATION_PRESET_OPTIONS,
  buildShoeRoomGradientCss,
  deriveModelGroupKey,
  formatPHP,
  SHOE_ANGLE_OPTIONS,
} from "../data/shoeCatalog";
import type {
  AngleKey,
  AnimationPresetType,
  FeaturedShoe,
  ShoeAngleSet,
  ShoeCategory,
} from "../data/shoeCatalog";
import type {
  AppUser,
  AuditLogRecord,
  CreateShoeInput,
  OrderRecord,
  OrderStatusType,
  PaymentMethodType,
} from "../services/api";
import {
  extractShoeColorPalette,
  resolveAssetUrl,
  useShoeCutoutUrl,
} from "../utils/useTransparentCutout";

interface AdminDashboardPageProps {
  users: AppUser[];
  products: FeaturedShoe[];
  orders: OrderRecord[];
  auditLogs: AuditLogRecord[];
  onRefreshAuditLogs: () => Promise<void>;
  onBackHome: () => void;
  onCreateUser: (data: {
    username: string;
    email: string;
    password: string;
    role: "customer" | "admin";
  }) => Promise<void>;
  onUpdateUser: (
    userId: string,
    updates: Partial<Pick<AppUser, "username" | "email" | "password" | "role">>
  ) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onUploadShoeAngles: (
    files: Partial<Record<AngleKey, File>>
  ) => Promise<Partial<Record<AngleKey, string>>>;
  onSeedDemoProducts: () => Promise<void>;
  onCreateProduct: (data: CreateShoeInput) => Promise<FeaturedShoe>;
  onUpdateProduct: (
    shoeId: string,
    updates: Partial<FeaturedShoe>
  ) => Promise<void>;
  onDeleteProduct: (shoeId: string) => Promise<void>;
  onUpdateOrderStatus: (
    orderId: string,
    status: OrderStatusType
  ) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
}

type AdminTab = "users" | "orders" | "inventory" | "audit";

const SCHEMA_WIRING_NODES = [
  {
    name: "users",
    pk: "_id (ObjectId)",
    links: [
      "likedProductIds[] → products._id",
      "baskets.userId → _id (1:1)",
      "orders.userId → _id (1:N)",
      "reviews.userId → _id (1:N)",
      "audit_logs.actorUserId → _id (1:N)",
    ],
  },
  {
    name: "products",
    pk: "_id (ObjectId)",
    links: [
      "createdBy → users._id",
      "parentProductId → products._id (colorways)",
      "baskets.items[].productId → _id",
      "orders.items[].productId → _id",
      "reviews.productId → _id (1:N)",
    ],
  },
  {
    name: "baskets",
    pk: "_id (ObjectId)",
    links: [
      "userId → users._id (unique FK)",
      "items[].productId → products._id",
    ],
  },
  {
    name: "reviews",
    pk: "_id (ObjectId)",
    links: [
      "productId → products._id (FK)",
      "userId → users._id (FK)",
    ],
  },
  {
    name: "orders",
    pk: "_id (ObjectId)",
    links: [
      "userId → users._id (FK)",
      "items[].productId → products._id (FK)",
    ],
  },
  {
    name: "audit_logs",
    pk: "_id (ObjectId)",
    links: [
      "actorUserId → users._id (FK)",
      "targetProductId → products._id (FK)",
      "targetOrderId → orders._id (FK)",
    ],
  },
] as const;

const DEFAULT_SIZE_CHOICES = [
  "US 6.5",
  "US 7",
  "US 7.5",
  "US 8",
  "US 8.5",
  "US 9",
  "US 9.5",
  "US 10",
  "US 10.5",
  "US 11",
  "US 12",
];

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return [52, 56, 72];
  return [
    parseInt(clean.slice(0, 2), 16) || 52,
    parseInt(clean.slice(2, 4), 16) || 56,
    parseInt(clean.slice(4, 6), 16) || 72,
  ];
}

function rgbTupleToHex(rgb: [number, number, number]): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(rgb[0])}${h(rgb[1])}${h(rgb[2])}`;
}

function buildMergedAngleSet(
  uploadedUrls: Partial<Record<AngleKey, string>>,
  existing?: Partial<Record<AngleKey, string>>
): ShoeAngleSet {
  return {
    lateral: uploadedUrls.lateral ?? existing?.lateral ?? "",
    pairAngle: uploadedUrls.pairAngle ?? existing?.pairAngle ?? "",
    medial: uploadedUrls.medial ?? existing?.medial ?? "",
    topDown: uploadedUrls.topDown ?? existing?.topDown ?? "",
    outsole: uploadedUrls.outsole ?? existing?.outsole ?? "",
    heel: uploadedUrls.heel ?? existing?.heel ?? "",
  };
}

function AngleUploadGrid({
  localPreviews,
  savedAngles,
  onSelectFile,
}: {
  localPreviews: Partial<Record<AngleKey, string>>;
  savedAngles?: Partial<Record<AngleKey, string>>;
  onSelectFile: (angleKey: AngleKey, file: File | null) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {SHOE_ANGLE_OPTIONS.map((opt) => {
        const isReq = opt.key === "lateral";
        const preview =
          localPreviews[opt.key] ||
          (savedAngles?.[opt.key] ? resolveAssetUrl(savedAngles[opt.key]!) : "");
        return (
          <label
            key={opt.key}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-2.5 text-center transition ${
              preview
                ? "border-emerald-400/50 bg-emerald-500/10"
                : isReq
                  ? "border-amber-400/60 bg-amber-400/5 hover:border-amber-300"
                  : "border-white/20 bg-white/[0.02] hover:border-white/40"
            }`}
          >
            <input
              type="file"
              accept=".avif,.png,.jpg,.jpeg,.webp,image/avif,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) =>
                onSelectFile(opt.key, e.target.files?.[0] ?? null)
              }
            />
            {preview ? (
              <img
                src={preview}
                alt={opt.label}
                className="h-12 w-full rounded bg-[#F5F5F5] object-contain p-1"
              />
            ) : (
              <Upload className="h-4 w-4 text-zinc-400" />
            )}
            <span className="mt-1.5 text-[11px] font-semibold text-white">
              {opt.label} {isReq ? "*" : ""}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function AdminDashboardPage({
  users,
  products,
  orders,
  auditLogs,
  onRefreshAuditLogs,
  onBackHome,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onUploadShoeAngles,
  onSeedDemoProducts,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateOrderStatus,
  onDeleteOrder,
}: AdminDashboardPageProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previewShoeRef = useRef<HTMLImageElement | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("inventory");

  // Search & Filter states across tabs
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "customer" | "admin">("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"All" | OrderStatusType>("All");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<"All" | PaymentMethodType>("All");
  const [invSearch, setInvSearch] = useState("");
  const [invCategoryFilter, setInvCategoryFilter] = useState<"All" | Exclude<ShoeCategory, "All Shoes">>("All");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditCollectionFilter, setAuditCollectionFilter] = useState<string>("All");
  const [auditStatusFilter, setAuditStatusFilter] = useState<"All" | "SUCCESS" | "FAILURE">("All");
  const [isRefreshingAudit, setIsRefreshingAudit] = useState(false);

  // User Edit / Create Modal States
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [uUsername, setUUsername] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uRole, setURole] = useState<"customer" | "admin">("customer");

  // Shoe Upload Studio Modal States
  const [isCreatingShoe, setIsCreatingShoe] = useState(false);
  const [editingShoe, setEditingShoe] = useState<FeaturedShoe | null>(null);
  const [sName, setSName] = useState("");
  const [sColorway, setSColorway] = useState("");
  const [sCategory, setSCategory] =
    useState<Exclude<ShoeCategory, "All Shoes">>("Basketball Shoes");
  const [sPrice, setSPrice] = useState("6995");
  const [sStock, setSStock] = useState("15");
  const [sBadge, setSBadge] = useState("New Release");
  const [sHeroWord, setSHeroWord] = useState("VELOCITY");
  const [sTagline, setSTagline] = useState("");
  const [sDescription, setSDescription] = useState("");
  const [sFeaturedInHero, setSFeaturedInHero] = useState(true);
  const [sPreset, setSPreset] = useState<AnimationPresetType>("studio-float");
  const [sSensitivity, setSSensitivity] = useState(50);
  const [sRoomRgb, setSRoomRgb] = useState<[number, number, number]>([52, 56, 72]);
  const [sAccentHex, setSAccentHex] = useState("#F59E0B");
  const [sGlowRgb, setSGlowRgb] = useState("245, 158, 11");
  const [sSizes, setSSizes] = useState<string[]>([
    "US 7",
    "US 8",
    "US 9",
    "US 10",
    "US 11",
  ]);
  const [sAngles, setSAngles] = useState<Partial<Record<AngleKey, string>>>({});
  const [pendingFiles, setPendingFiles] = useState<Partial<Record<AngleKey, File>>>({});
  const [localPreviews, setLocalPreviews] = useState<Partial<Record<AngleKey, string>>>({});
  const [sParentProductId, setSParentProductId] = useState<string>("");
  const [sModelGroup, setSModelGroup] = useState<string>("");
  const [addSecondColorway, setAddSecondColorway] = useState(false);
  const [s2Colorway, setS2Colorway] = useState("");
  const [s2Stock, setS2Stock] = useState("10");
  const [s2PendingFiles, setS2PendingFiles] = useState<Partial<Record<AngleKey, File>>>({});
  const [s2LocalPreviews, setS2LocalPreviews] = useState<Partial<Record<AngleKey, string>>>({});
  const [shoeFormError, setShoeFormError] = useState<string | null>(null);
  const [isSavingShoe, setIsSavingShoe] = useState(false);

  const previewLateralSrc =
    localPreviews.lateral || sAngles.lateral || "";
  const previewCutoutUrl = useShoeCutoutUrl(previewLateralSrc, sSensitivity);

  // KPI computations
  const kpis = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingOrders = orders.filter((o) => o.status === "Pending").length;
    const lowStockShoes = products.filter((p) => p.stock <= 3).length;
    return {
      totalRevenue,
      totalOrders: orders.length,
      pendingOrders,
      lowStockShoes,
      totalUsers: users.length,
    };
  }, [orders, products, users]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
      if (!q) return true;
      return (
        u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    });
  }, [users, userSearch, userRoleFilter]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (orderStatusFilter !== "All" && o.status !== orderStatusFilter) return false;
      if (orderPaymentFilter !== "All" && o.paymentMethod !== orderPaymentFilter) {
        return false;
      }
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.username.toLowerCase().includes(q) ||
        o.userEmail.toLowerCase().includes(q)
      );
    });
  }, [orders, orderSearch, orderStatusFilter, orderPaymentFilter]);

  const filteredProducts = useMemo(() => {
    const q = invSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (invCategoryFilter !== "All" && p.category !== invCategoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.colorwayName.toLowerCase().includes(q)
      );
    });
  }, [products, invSearch, invCategoryFilter]);

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return auditLogs.filter((log) => {
      if (
        auditCollectionFilter !== "All" &&
        log.targetCollection !== auditCollectionFilter
      ) {
        return false;
      }
      if (auditStatusFilter !== "All" && log.status !== auditStatusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        log.actorUsername.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.ipAddress.toLowerCase().includes(q)
      );
    });
  }, [auditLogs, auditSearch, auditCollectionFilter, auditStatusFilter]);

  const handleRefreshAudit = async () => {
    setIsRefreshingAudit(true);
    try {
      await onRefreshAuditLogs();
    } finally {
      setIsRefreshingAudit(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (panelRef.current) {
      animate(panelRef.current, {
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 420,
        ease: "outExpo",
      });
    }
  }, [activeTab]);

  const openEditUserModal = (u: AppUser) => {
    setEditingUser(u);
    setIsCreatingUser(false);
    setUUsername(u.username);
    setUEmail(u.email);
    setUPassword("");
    setURole(u.role);
  };

  const openCreateUserModal = () => {
    setEditingUser(null);
    setIsCreatingUser(true);
    setUUsername("");
    setUEmail("");
    setUPassword("");
    setURole("customer");
  };

  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const updates: Partial<
        Pick<AppUser, "username" | "email" | "password" | "role">
      > = {
        username: uUsername.trim(),
        email: uEmail.trim().toLowerCase(),
        role: uRole,
      };
      if (uPassword.trim().length >= 6) {
        updates.password = uPassword;
      }
      await onUpdateUser(editingUser._id, updates);
      setEditingUser(null);
    } else if (isCreatingUser) {
      await onCreateUser({
        username: uUsername.trim(),
        email: uEmail.trim().toLowerCase(),
        password: uPassword,
        role: uRole,
      });
      setIsCreatingUser(false);
    }
  };

  const resetShoeModalFiles = () => {
    [...Object.values(localPreviews), ...Object.values(s2LocalPreviews)].forEach(
      (url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      }
    );
    setPendingFiles({});
    setLocalPreviews({});
    setS2PendingFiles({});
    setS2LocalPreviews({});
    setShoeFormError(null);
  };

  const applyParentModelPreset = (parentShoe: FeaturedShoe | null) => {
    if (!parentShoe) {
      setSParentProductId("");
      setSModelGroup("");
      return;
    }
    setSParentProductId(parentShoe._id ?? parentShoe.id);
    setSModelGroup(
      parentShoe.modelGroup || deriveModelGroupKey(parentShoe.name)
    );
    setAddSecondColorway(false);
    if (!sName.trim()) setSName(parentShoe.name);
    setSCategory(parentShoe.category);
    setSPrice(String(parentShoe.price));
    setSBadge(parentShoe.badge);
    setSHeroWord(parentShoe.heroWord || "VELOCITY");
    if (!sDescription.trim()) setSDescription(parentShoe.description || "");
    if (parentShoe.sizes?.length) setSSizes(parentShoe.sizes);
  };

  const openCreateShoeModal = (parentShoe?: FeaturedShoe) => {
    resetShoeModalFiles();
    setEditingShoe(null);
    setIsCreatingShoe(true);
    setSName(parentShoe ? parentShoe.name : "");
    setSColorway("");
    setSCategory(parentShoe ? parentShoe.category : "Basketball Shoes");
    setSPrice(parentShoe ? String(parentShoe.price) : "6995");
    setSStock("12");
    setSBadge(parentShoe ? parentShoe.badge : "New Release");
    setSHeroWord(parentShoe?.heroWord || "VELOCITY");
    setSTagline(parentShoe?.tagline || "");
    setSDescription(parentShoe?.description || "");
    setSFeaturedInHero(true);
    setSPreset(parentShoe?.animationPreset ?? "studio-float");
    setSSensitivity(parentShoe?.cutoutSensitivity ?? 50);
    setSRoomRgb([52, 56, 72]);
    setSAccentHex("#F59E0B");
    setSGlowRgb("245, 158, 11");
    setSSizes(
      parentShoe?.sizes?.length
        ? parentShoe.sizes
        : ["US 7", "US 8", "US 9", "US 10", "US 11"]
    );
    setSAngles({});
    setSParentProductId(parentShoe ? (parentShoe._id ?? parentShoe.id) : "");
    setSModelGroup(
      parentShoe
        ? parentShoe.modelGroup || deriveModelGroupKey(parentShoe.name)
        : ""
    );
    setAddSecondColorway(false);
    setS2Colorway("");
    setS2Stock("10");
  };

  const openEditShoeModal = (shoe: FeaturedShoe) => {
    resetShoeModalFiles();
    setIsCreatingShoe(false);
    setEditingShoe(shoe);
    setSName(shoe.name);
    setSColorway(shoe.colorwayName);
    setSCategory(shoe.category);
    setSPrice(String(shoe.price));
    setSStock(String(shoe.stock));
    setSBadge(shoe.badge);
    setSHeroWord(shoe.heroWord || "VELOCITY");
    setSTagline(shoe.tagline || "");
    setSDescription(shoe.description || "");
    setSFeaturedInHero(Boolean(shoe.featuredInHero));
    setSPreset(shoe.animationPreset ?? "studio-float");
    setSSensitivity(shoe.cutoutSensitivity ?? 50);
    setSRoomRgb(shoe.roomRgb?.length === 3 ? shoe.roomRgb : [52, 56, 72]);
    setSAccentHex(shoe.accentHex || "#F59E0B");
    setSGlowRgb(shoe.glowRgb || "245, 158, 11");
    setSSizes(shoe.sizes?.length ? shoe.sizes : ["US 8", "US 9", "US 10"]);
    setSAngles({ ...shoe.angles });
    setSParentProductId(shoe.parentProductId ?? "");
    setSModelGroup(shoe.modelGroup || deriveModelGroupKey(shoe.name));
    setAddSecondColorway(false);
    setS2Colorway("");
    setS2Stock("10");
  };

  const handleSelectAngleFile = async (angleKey: AngleKey, file: File | null) => {
    if (!file) return;
    setShoeFormError(null);

    const previewUrl = URL.createObjectURL(file);
    setPendingFiles((prev) => ({ ...prev, [angleKey]: file }));
    setLocalPreviews((prev) => ({ ...prev, [angleKey]: previewUrl }));

    if (angleKey === "lateral") {
      const palette = await extractShoeColorPalette(previewUrl, sSensitivity);
      setSRoomRgb(palette.roomRgb);
      setSAccentHex(palette.accentHex);
      setSGlowRgb(palette.glowRgb);
    }
  };

  const handleSelectSecondAngleFile = (
    angleKey: AngleKey,
    file: File | null
  ) => {
    if (!file) return;
    setShoeFormError(null);
    const previewUrl = URL.createObjectURL(file);
    setS2PendingFiles((prev) => ({ ...prev, [angleKey]: file }));
    setS2LocalPreviews((prev) => ({ ...prev, [angleKey]: previewUrl }));
  };

  const handleReExtractPalette = async () => {
    if (!previewLateralSrc) return;
    const palette = await extractShoeColorPalette(previewLateralSrc, sSensitivity);
    setSRoomRgb(palette.roomRgb);
    setSAccentHex(palette.accentHex);
    setSGlowRgb(palette.glowRgb);
  };

  const toggleSizeOption = (size: string) => {
    setSSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleSaveShoe = async (e: FormEvent) => {
    e.preventDefault();
    setShoeFormError(null);

    const hasLateral = Boolean(pendingFiles.lateral || sAngles.lateral);
    if (!hasLateral) {
      setShoeFormError("Lateral Profile photo is required.");
      return;
    }

    if (!editingShoe && addSecondColorway) {
      if (!s2Colorway.trim()) {
        setShoeFormError("2nd Colorway Name is required.");
        return;
      }
      if (!s2PendingFiles.lateral) {
        setShoeFormError("2nd Colorway Lateral Profile photo is required.");
        return;
      }
    }

    setIsSavingShoe(true);
    try {
      const uploadedUrls = await onUploadShoeAngles(pendingFiles);
      const mergedAngles = buildMergedAngleSet(uploadedUrls, sAngles);
      const resolvedModelGroup =
        sModelGroup.trim() || deriveModelGroupKey(sName.trim());
      const resolvedParentObj = products.find(
        (p) => (p._id ?? p.id) === sParentProductId
      );

      const payload: CreateShoeInput = {
        name: sName.trim(),
        colorwayName: sColorway.trim(),
        modelGroup: resolvedModelGroup,
        parentProductId: resolvedParentObj?._id ?? null,
        category: sCategory,
        price: Number(sPrice),
        stock: Number(sStock),
        badge: sBadge.trim() || "New Release",
        heroWord: sHeroWord.trim().toUpperCase() || "VELOCITY",
        tagline: sTagline.trim(),
        description: sDescription.trim(),
        featuredInHero: sFeaturedInHero,
        animationPreset: sPreset,
        cutoutSensitivity: sSensitivity,
        roomRgb: sRoomRgb,
        accentHex: sAccentHex,
        glowRgb: sGlowRgb,
        sizes: sSizes.length > 0 ? sSizes : ["US 8", "US 9", "US 10"],
        angles: mergedAngles,
      };

      if (editingShoe) {
        await onUpdateProduct(editingShoe.id, payload);
        setEditingShoe(null);
      } else {
        const createdFirst = await onCreateProduct(payload);
        if (addSecondColorway && s2PendingFiles.lateral) {
          const uploadedSecondUrls = await onUploadShoeAngles(s2PendingFiles);
          const secondAngles = buildMergedAngleSet(uploadedSecondUrls);
          const secondPalette = s2LocalPreviews.lateral
            ? await extractShoeColorPalette(
                s2LocalPreviews.lateral,
                sSensitivity
              )
            : { roomRgb: sRoomRgb, accentHex: sAccentHex, glowRgb: sGlowRgb };

          await onCreateProduct({
            ...payload,
            colorwayName: s2Colorway.trim(),
            stock: Number(s2Stock),
            modelGroup: createdFirst.modelGroup || resolvedModelGroup,
            parentProductId: createdFirst._id ?? null,
            roomRgb: secondPalette.roomRgb,
            accentHex: secondPalette.accentHex,
            glowRgb: secondPalette.glowRgb,
            angles: secondAngles,
          });
        }
        setIsCreatingShoe(false);
      }
      resetShoeModalFiles();
    } catch (err) {
      setShoeFormError(
        err instanceof Error ? err.message : "Failed to save shoe."
      );
    } finally {
      setIsSavingShoe(false);
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#070709] pt-28 pb-20 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-12 left-[10%] h-96 w-96 rounded-full bg-amber-500/15 blur-[130px]" />
        <div className="absolute right-[10%] bottom-10 h-96 w-96 rounded-full bg-purple-600/15 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10">
        {/* Header & Tab Switchers (All verbose helper subtitles removed) */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={onBackHome}
              className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white hover:bg-white hover:text-black"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Storefront</span>
            </button>
            <h1 className="font-sport text-3xl tracking-wide text-white uppercase italic sm:text-4xl">
              SOLE PURPOSE <span className="text-amber-300">ADMIN PANEL</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-black/50 p-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("inventory")}
              className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold tracking-wide uppercase transition ${
                activeTab === "inventory"
                  ? "bg-amber-400 text-black shadow"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <Boxes className="h-4 w-4" />
              <span>Shoe Inventory ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold tracking-wide uppercase transition ${
                activeTab === "orders"
                  ? "bg-amber-400 text-black shadow"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Orders ({orders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold tracking-wide uppercase transition ${
                activeTab === "users"
                  ? "bg-amber-400 text-black shadow"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Users ({users.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("audit");
                void handleRefreshAudit();
              }}
              className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold tracking-wide uppercase transition ${
                activeTab === "audit"
                  ? "bg-amber-400 text-black shadow"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>IA Audit Logs ({auditLogs.length})</span>
            </button>
          </div>
        </div>

        {/* 4 Executive KPI Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Total Revenue</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="font-mono-tabular mt-1.5 text-2xl font-bold text-white">
              {formatPHP(kpis.totalRevenue)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Total Orders</span>
              <Package className="h-4 w-4 text-amber-300" />
            </div>
            <p className="font-mono-tabular mt-1.5 text-2xl font-bold text-white">
              {kpis.totalOrders}{" "}
              <span className="text-xs font-normal text-zinc-400">
                ({kpis.pendingOrders} pending)
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Low-Stock Alerts</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <p className="font-mono-tabular mt-1.5 text-2xl font-bold text-amber-300">
              {kpis.lowStockShoes}
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Registered Users</span>
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <p className="font-mono-tabular mt-1.5 text-2xl font-bold text-white">
              {kpis.totalUsers}
            </p>
          </div>
        </div>

        {/* MAIN CRUD PANEL */}
        <div
          ref={panelRef}
          className="rounded-3xl border border-white/15 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8"
        >
          {/* TAB 1: USER PROFILES */}
          {activeTab === "users" && (
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-sport text-2xl tracking-wide text-white uppercase italic">
                  USER PROFILES
                </h2>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search username or email..."
                      className="rounded-full border border-white/15 bg-black/50 py-2 pr-3 pl-8 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <select
                    value={userRoleFilter}
                    onChange={(e) =>
                      setUserRoleFilter(
                        e.target.value as "all" | "customer" | "admin"
                      )
                    }
                    className="rounded-full border border-white/15 bg-black/50 px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="all">Role: All</option>
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="button"
                    onClick={openCreateUserModal}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold tracking-wider text-black uppercase transition hover:bg-amber-300"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add User</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/15 text-zinc-400 uppercase">
                    <tr>
                      <th className="py-3 pr-4">Username</th>
                      <th className="py-3 pr-4">Email Address</th>
                      <th className="py-3 pr-4">Security</th>
                      <th className="py-3 pr-4">Role</th>
                      <th className="py-3 pr-4">Liked</th>
                      <th className="py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-white/[0.02]">
                        <td className="py-4 pr-4 font-semibold text-white">
                          @{u.username}
                        </td>
                        <td className="py-4 pr-4 text-zinc-300">{u.email}</td>
                        <td className="py-4 pr-4">
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                            Protected (bcrypt)
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                              u.role === "admin"
                                ? "bg-amber-400/20 text-amber-300"
                                : "bg-blue-500/20 text-blue-300"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="font-mono-tabular py-4 pr-4 text-zinc-400">
                          {u.likedShoeIds?.length ?? 0}
                        </td>
                        <td className="py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditUserModal(u)}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-amber-400 hover:bg-amber-400 hover:text-black"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteUser(u._id)}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500 hover:text-white"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ORDERS & BUYERS */}
          {activeTab === "orders" && (
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-sport text-2xl tracking-wide text-white uppercase italic">
                  ORDERS &amp; PURCHASES
                </h2>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Order ID or buyer..."
                      className="rounded-full border border-white/15 bg-black/50 py-2 pr-3 pl-8 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) =>
                      setOrderStatusFilter(
                        e.target.value as "All" | OrderStatusType
                      )
                    }
                    className="rounded-full border border-white/15 bg-black/50 px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="All">Status: All</option>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                  <select
                    value={orderPaymentFilter}
                    onChange={(e) =>
                      setOrderPaymentFilter(
                        e.target.value as "All" | PaymentMethodType
                      )
                    }
                    className="rounded-full border border-white/15 bg-black/50 px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="All">Payment: All</option>
                    <option value="COD">COD</option>
                    <option value="E-Wallet">E-Wallet</option>
                    <option value="Debit/Credit Card">Debit/Credit Card</option>
                  </select>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-400">
                  No matching orders recorded yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((ord) => (
                    <div
                      key={ord._id}
                      className="rounded-2xl border border-white/15 bg-black/45 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3.5">
                        <div>
                          <span className="font-mono-tabular text-sm font-bold text-amber-300">
                            {ord.orderNumber}
                          </span>
                          <span className="ml-3 text-xs text-zinc-300">
                            Buyer:{" "}
                            <strong className="text-white">
                              @{ord.username}
                            </strong>{" "}
                            ({ord.userEmail})
                          </span>
                          <span className="ml-3 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-200">
                            {ord.paymentMethod}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <select
                            value={ord.status}
                            onChange={(e) =>
                              onUpdateOrderStatus(
                                ord._id,
                                e.target.value as OrderStatusType
                              )
                            }
                            className="cursor-pointer rounded-xl border border-white/20 bg-[#14161f] px-3 py-1.5 text-xs font-semibold text-emerald-300 focus:outline-none"
                          >
                            <option value="Pending">Status: Pending</option>
                            <option value="Paid">Status: Paid</option>
                            <option value="Shipped">Status: Shipped</option>
                            <option value="Delivered">Status: Delivered</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => onDeleteOrder(ord._id)}
                            className="cursor-pointer rounded-xl border border-red-500/30 bg-red-500/15 p-2 text-red-300 transition hover:bg-red-500 hover:text-white"
                            title="Delete order record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3.5 grid grid-cols-1 gap-4 md:grid-cols-12">
                        <div className="space-y-2 md:col-span-7">
                          <p className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                            Shoes Purchased
                          </p>
                          {ord.items.map((item, idx) => (
                            <div
                              key={`${ord._id}-${idx}`}
                              className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={resolveAssetUrl(item.imageUrl)}
                                  alt={item.shoeName}
                                  className="h-10 w-10 rounded-lg bg-[#F5F5F5] object-contain p-1"
                                />
                                <div>
                                  <p className="font-semibold text-white">
                                    {item.shoeName}
                                  </p>
                                  <p className="text-zinc-400">
                                    Size: {item.size} · Quantity: {item.quantity}
                                  </p>
                                </div>
                              </div>
                              <span className="font-mono-tabular font-bold text-white">
                                {formatPHP(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col justify-between rounded-xl bg-white/[0.03] p-3.5 text-xs md:col-span-5">
                          <div>
                            <p className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                              Delivery Destination
                            </p>
                            <p className="mt-1 font-semibold text-white">
                              {ord.shippingAddress.fullName} (
                              {ord.shippingAddress.phone})
                            </p>
                            <p className="text-zinc-400">
                              {ord.shippingAddress.street},{" "}
                              {ord.shippingAddress.city},{" "}
                              {ord.shippingAddress.province}{" "}
                              {ord.shippingAddress.postalCode}
                            </p>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
                            <span className="text-zinc-400">Order Total</span>
                            <span className="font-mono-tabular text-sm font-bold text-amber-300">
                              {formatPHP(ord.totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SHOE STOCK & UPLOAD STUDIO */}
          {activeTab === "inventory" && (
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-sport text-2xl tracking-wide text-white uppercase italic">
                  SHOE STOCK &amp; CATALOG
                </h2>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={invSearch}
                      onChange={(e) => setInvSearch(e.target.value)}
                      placeholder="Search shoe or SKU..."
                      className="rounded-full border border-white/15 bg-black/50 py-2 pr-3 pl-8 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <select
                    value={invCategoryFilter}
                    onChange={(e) =>
                      setInvCategoryFilter(
                        e.target.value as
                          | "All"
                          | Exclude<ShoeCategory, "All Shoes">
                      )
                    }
                    className="rounded-full border border-white/15 bg-black/50 px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    <option value="Basketball Shoes">Basketball Shoes</option>
                    <option value="Running Shoes">Running Shoes</option>
                    <option value="Sandals & Slides">Sandals &amp; Slides</option>
                    <option value="Lifestyle">Lifestyle</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => void onSeedDemoProducts()}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-amber-400 hover:text-amber-300"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Load Starter Demo Shoes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openCreateShoeModal()}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold tracking-wider text-black uppercase transition hover:bg-amber-300"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Shoe</span>
                  </button>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/35 p-10 text-center">
                  <p className="text-sm font-semibold text-white">
                    No shoes in inventory yet.
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Click &ldquo;Add Shoe&rdquo; to upload Nike studio photos
                    with automatic background removal, or load starter demo
                    shoes.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/15 text-zinc-400 uppercase">
                      <tr>
                        <th className="py-3 pr-4">Shoe (Lateral Profile)</th>
                        <th className="py-3 pr-4">Category</th>
                        <th className="py-3 pr-4">Hero / Motion</th>
                        <th className="py-3 pr-4">Price</th>
                        <th className="py-3 pr-4">Stock</th>
                        <th className="py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredProducts.map((shoe) => (
                        <tr key={shoe.id} className="hover:bg-white/[0.02]">
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={resolveAssetUrl(shoe.angles.lateral)}
                                alt={shoe.name}
                                className="h-12 w-12 rounded-xl bg-[#F5F5F5] object-contain p-1"
                              />
                              <div>
                                <p className="font-semibold text-white">
                                  {shoe.name}
                                </p>
                                <p className="text-[11px] text-zinc-400">
                                  {shoe.sku} · {shoe.colorwayName}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 pr-4 text-zinc-300">
                            {shoe.category}
                          </td>
                          <td className="py-3.5 pr-4">
                            <div className="flex flex-col gap-1">
                              {shoe.featuredInHero && (
                                <span className="w-fit rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                                  In Hero
                                </span>
                              )}
                              <span className="text-[11px] text-zinc-400">
                                {shoe.animationPreset ?? "studio-float"}
                              </span>
                            </div>
                          </td>
                          <td className="font-mono-tabular py-3.5 pr-4 font-bold text-white">
                            {formatPHP(shoe.price)}
                          </td>
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateProduct(shoe.id, {
                                    stock: Math.max(0, shoe.stock - 1),
                                  })
                                }
                                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-white/5 font-bold text-white hover:bg-white/20"
                              >
                                -
                              </button>
                              <span
                                className={`font-mono-tabular min-w-20 rounded-full px-3 py-1 text-center text-xs font-bold ${
                                  shoe.stock <= 0
                                    ? "bg-red-500/20 text-red-300"
                                    : shoe.stock <= 3
                                      ? "bg-amber-500/20 text-amber-300"
                                      : "bg-emerald-500/20 text-emerald-300"
                                }`}
                              >
                                {shoe.stock} left
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateProduct(shoe.id, {
                                    stock: shoe.stock + 1,
                                  })
                                }
                                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-white/5 font-bold text-white hover:bg-white/20"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openCreateShoeModal(shoe)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-400 hover:text-black"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Colorway</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditShoeModal(shoe)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-amber-400 hover:bg-amber-400 hover:text-black"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteProduct(shoe.id)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500 hover:text-white"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INFORMATION ASSURANCE AUDIT LOGS & SCHEMA MAP */}
          {activeTab === "audit" && (
            <div className="space-y-6">
              {/* Mongoose 6-Collection Relationship Summary */}
              <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.04] p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-amber-300" />
                    <h2 className="font-sport text-xl tracking-wide text-white uppercase italic">
                      MONGOOSE 6-COLLECTION RELATIONAL WIRING
                    </h2>
                  </div>
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                    All FKs Typed as Schema.Types.ObjectId
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {SCHEMA_WIRING_NODES.map((node) => (
                    <div
                      key={node.name}
                      className="rounded-xl border border-white/10 bg-black/45 p-3.5 text-xs"
                    >
                      <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-1.5">
                        <span className="font-mono-tabular font-bold text-amber-300">
                          {node.name}
                        </span>
                        <span className="font-mono-tabular text-[10px] text-zinc-400">
                          PK: {node.pk}
                        </span>
                      </div>
                      <ul className="space-y-1 text-[11px] text-zinc-300">
                        {node.links.map((link) => (
                          <li key={link} className="font-mono-tabular truncate">
                            ↳ {link}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Security & CRUD Audit Trail */}
              <div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <h2 className="font-sport text-2xl tracking-wide text-white uppercase italic">
                    SECURITY &amp; CRUD AUDIT TRAIL
                  </h2>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        placeholder="Search actor, action, IP..."
                        className="rounded-full border border-white/15 bg-black/50 py-2 pr-3 pl-8 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <select
                      value={auditCollectionFilter}
                      onChange={(e) => setAuditCollectionFilter(e.target.value)}
                      className="rounded-full border border-white/15 bg-black/50 px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="All">All Collections</option>
                      <option value="users">users</option>
                      <option value="products">products</option>
                      <option value="baskets">baskets</option>
                      <option value="reviews">reviews</option>
                      <option value="orders">orders</option>
                      <option value="system">system</option>
                    </select>
                    <select
                      value={auditStatusFilter}
                      onChange={(e) =>
                        setAuditStatusFilter(
                          e.target.value as "All" | "SUCCESS" | "FAILURE"
                        )
                      }
                      className="rounded-full border border-white/15 bg-black/50 px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="All">Status: All</option>
                      <option value="SUCCESS">SUCCESS</option>
                      <option value="FAILURE">FAILURE</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleRefreshAudit()}
                      disabled={isRefreshingAudit}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-amber-400 hover:text-amber-300 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${isRefreshingAudit ? "animate-spin" : ""}`}
                      />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {filteredAuditLogs.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/35 p-8 text-center text-xs text-zinc-400">
                    No audit log events match your current filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-white/15 text-zinc-400 uppercase">
                        <tr>
                          <th className="py-3 pr-4">Time</th>
                          <th className="py-3 pr-4">Actor (User FK)</th>
                          <th className="py-3 pr-4">Action</th>
                          <th className="py-3 pr-4">Collection &amp; Ref</th>
                          <th className="py-3 pr-4">Outcome</th>
                          <th className="py-3 pr-4">Details</th>
                          <th className="py-3 text-right">IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {filteredAuditLogs.map((log) => {
                          const actorObj =
                            log.actorUserId &&
                            typeof log.actorUserId === "object"
                              ? log.actorUserId
                              : null;
                          const prodObj =
                            log.targetProductId &&
                            typeof log.targetProductId === "object"
                              ? log.targetProductId
                              : null;
                          const ordObj =
                            log.targetOrderId &&
                            typeof log.targetOrderId === "object"
                              ? log.targetOrderId
                              : null;
                          return (
                            <tr
                              key={log._id}
                              className="hover:bg-white/[0.02]"
                            >
                              <td className="font-mono-tabular py-3 pr-4 whitespace-nowrap text-[11px] text-zinc-400">
                                {new Date(log.createdAt).toLocaleString()}
                              </td>
                              <td className="py-3 pr-4">
                                <span className="font-semibold text-white">
                                  @{actorObj?.username ?? log.actorUsername}
                                </span>
                                {actorObj?.role && (
                                  <span className="ml-1.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-300 uppercase">
                                    {actorObj.role}
                                  </span>
                                )}
                              </td>
                              <td className="font-mono-tabular py-3 pr-4 font-semibold text-amber-300">
                                {log.action}
                              </td>
                              <td className="py-3 pr-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-mono-tabular text-[11px] font-semibold text-zinc-200">
                                    {log.targetCollection}
                                  </span>
                                  {prodObj && (
                                    <span className="text-[10px] text-zinc-400">
                                      Shoe: {prodObj.name} ({prodObj.sku})
                                    </span>
                                  )}
                                  {ordObj && (
                                    <span className="text-[10px] text-zinc-400">
                                      Order: {ordObj.orderNumber}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                    log.status === "SUCCESS"
                                      ? "bg-emerald-500/20 text-emerald-300"
                                      : "bg-red-500/20 text-red-300"
                                  }`}
                                >
                                  {log.status}
                                </span>
                              </td>
                              <td className="max-w-xs py-3 pr-4 text-zinc-300">
                                {log.details}
                              </td>
                              <td className="font-mono-tabular py-3 text-right text-[11px] text-zinc-400">
                                {log.ipAddress}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* USER CREATE / EDIT MODAL */}
      {(editingUser || isCreatingUser) && (
        <div
          onClick={() => {
            setEditingUser(null);
            setIsCreatingUser(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#101118] p-7 text-white shadow-2xl"
          >
            <button
              type="button"
              onClick={() => {
                setEditingUser(null);
                setIsCreatingUser(false);
              }}
              className="absolute top-4 right-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-zinc-300 hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-sport text-xl uppercase italic">
              {editingUser
                ? `EDIT USER · @${editingUser.username}`
                : "CREATE NEW USER"}
            </h3>

            <form onSubmit={handleSaveUser} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={uUsername}
                  onChange={(e) => setUUsername(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={uEmail}
                  onChange={(e) => setUEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  {editingUser
                    ? "Reset Password (optional, min 6 chars)"
                    : "Password (min 6 chars)"}
                </label>
                <input
                  type="password"
                  required={isCreatingUser}
                  minLength={isCreatingUser ? 6 : undefined}
                  value={uPassword}
                  onChange={(e) => setUPassword(e.target.value)}
                  placeholder={
                    editingUser ? "Leave blank to keep existing hash" : ""
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Role
                </label>
                <select
                  value={uRole}
                  onChange={(e) =>
                    setURole(e.target.value as "customer" | "admin")
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white focus:outline-none"
                >
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-amber-400 py-3 text-xs font-bold tracking-widest text-black uppercase hover:bg-amber-300"
              >
                <Check className="h-4 w-4" />
                <span>Save User Profile</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SHOE UPLOAD STUDIO MODAL (White-BG Removal + Auto Color + Anime.js Presets) */}
      {(editingShoe || isCreatingShoe) && (
        <div
          onClick={() => {
            setEditingShoe(null);
            setIsCreatingShoe(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/15 bg-[#101118] p-6 text-white shadow-2xl sm:p-8"
          >
            <button
              type="button"
              onClick={() => {
                setEditingShoe(null);
                setIsCreatingShoe(false);
              }}
              className="sticky top-0 float-right flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-zinc-300 hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-sport text-2xl uppercase italic">
              {editingShoe
                ? `EDIT SHOE · ${editingShoe.name}`
                : "ADD SHOE & 3D STUDIO"}
            </h3>

            {shoeFormError && (
              <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/15 px-3.5 py-2.5 text-xs text-red-200">
                {shoeFormError}
              </div>
            )}

            <form
              onSubmit={handleSaveShoe}
              className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12"
            >
              {/* LEFT: Live 3D Cutout, Palette & Anime.js Preview */}
              <div className="space-y-4 lg:col-span-5">
                <div
                  className="relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/15 p-6"
                  style={{ backgroundImage: buildShoeRoomGradientCss(sRoomRgb) }}
                >
                  {previewCutoutUrl ? (
                    <>
                      <div className="pointer-events-none absolute bottom-10 h-5 w-3/4 rounded-full bg-black/45 blur-md" />
                      <img
                        ref={previewShoeRef}
                        src={previewCutoutUrl}
                        alt="Live Cutout Preview"
                        className="relative z-10 max-h-60 w-full object-contain drop-shadow-[0_22px_26px_rgba(0,0,0,0.55)]"
                      />
                    </>
                  ) : (
                    <div className="text-center text-xs text-zinc-300">
                      <Upload className="mx-auto mb-2 h-8 w-8 opacity-75" />
                      Upload a Lateral Profile Nike photo to preview auto
                      white-bg removal &amp; room color matching.
                    </div>
                  )}

                  {previewCutoutUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        playShoePresetAnimation(previewShoeRef.current, sPreset)
                      }
                      className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/90 px-4 py-1.5 text-[11px] font-bold text-black shadow transition hover:bg-amber-300"
                    >
                      <Play className="h-3 w-3" />
                      <span>Preview 3D Motion</span>
                    </button>
                  )}
                </div>

                {/* White-BG Sensitivity Slider */}
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">
                      White-BG Removal Sensitivity
                    </span>
                    <span className="font-mono-tabular text-amber-300">
                      {sSensitivity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sSensitivity}
                    onChange={(e) => setSSensitivity(Number(e.target.value))}
                    className="mt-2 w-full accent-amber-400"
                  />
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Lower for white-upper Nike shoes; higher to erase darker
                    floor shadows.
                  </p>
                </div>

                {/* Auto-Extracted Color Palette + Override */}
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                      <Palette className="h-3.5 w-3.5 text-amber-300" />
                      Studio Room Color
                    </span>
                    <button
                      type="button"
                      disabled={!previewLateralSrc}
                      onClick={() => void handleReExtractPalette()}
                      className="cursor-pointer text-[11px] font-semibold text-amber-300 hover:underline disabled:opacity-40"
                    >
                      Re-Extract From Photo
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="color"
                        value={rgbTupleToHex(sRoomRgb)}
                        onChange={(e) =>
                          setSRoomRgb(hexToRgbTuple(e.target.value))
                        }
                        className="h-8 w-8 cursor-pointer rounded border border-white/20 bg-transparent"
                      />
                      <span className="text-[11px] text-zinc-300">Room</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="color"
                        value={sAccentHex}
                        onChange={(e) => {
                          const hex = e.target.value;
                          const [r, g, b] = hexToRgbTuple(hex);
                          setSAccentHex(hex);
                          setSGlowRgb(`${r}, ${g}, ${b}`);
                        }}
                        className="h-8 w-8 cursor-pointer rounded border border-white/20 bg-transparent"
                      />
                      <span className="text-[11px] text-zinc-300">Accent</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* RIGHT: Shoe Details, Animation Controls & Multi-Angle Uploads */}
              <div className="space-y-3.5 text-xs lg:col-span-7">
                {products.length > 0 && (
                  <div>
                    <label className="block font-medium text-zinc-300">
                      Link as Colorway of Existing Shoe Model (Optional)
                    </label>
                    <select
                      value={sParentProductId}
                      onChange={(e) => {
                        const val = e.target.value;
                        const found =
                          products.find((p) => (p._id ?? p.id) === val) ?? null;
                        applyParentModelPreset(found);
                      }}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="">
                        Standalone New Shoe Model (No parent link)
                      </option>
                      {products
                        .filter((p) => !editingShoe || p.id !== editingShoe.id)
                        .map((p) => (
                          <option key={p.id} value={p._id ?? p.id}>
                            {p.name} ({p.colorwayName})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-medium text-zinc-300">
                      Shoe Model Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={sName}
                      onChange={(e) => setSName(e.target.value)}
                      placeholder="e.g. Nike Dunk Low Retro"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-300">
                      Colorway Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={sColorway}
                      onChange={(e) => setSColorway(e.target.value)}
                      placeholder="e.g. White / Black Panda"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="col-span-2">
                    <label className="block font-medium text-zinc-300">
                      Category
                    </label>
                    <select
                      value={sCategory}
                      onChange={(e) =>
                        setSCategory(
                          e.target.value as Exclude<ShoeCategory, "All Shoes">
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="Basketball Shoes">Basketball Shoes</option>
                      <option value="Running Shoes">Running Shoes</option>
                      <option value="Sandals & Slides">
                        Sandals &amp; Slides
                      </option>
                      <option value="Lifestyle">Lifestyle</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-300">
                      Price (₱) *
                    </label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={sPrice}
                      onChange={(e) => setSPrice(e.target.value)}
                      className="font-mono-tabular mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-300">
                      Stock *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={sStock}
                      onChange={(e) => setSStock(e.target.value)}
                      className="font-mono-tabular mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block font-medium text-zinc-300">
                      Badge
                    </label>
                    <input
                      type="text"
                      value={sBadge}
                      onChange={(e) => setSBadge(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-300">
                      Anime.js Preset
                    </label>
                    <select
                      value={sPreset}
                      onChange={(e) =>
                        setSPreset(e.target.value as AnimationPresetType)
                      }
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      {ANIMATION_PRESET_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-300">
                      Hero Display Word
                    </label>
                    <input
                      type="text"
                      value={sHeroWord}
                      onChange={(e) => setSHeroWord(e.target.value)}
                      placeholder="VELOCITY"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm text-white uppercase focus:outline-none"
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/15 bg-black/40 px-3.5 py-2.5">
                  <input
                    type="checkbox"
                    checked={sFeaturedInHero}
                    onChange={(e) => setSFeaturedInHero(e.target.checked)}
                    className="accent-amber-400"
                  />
                  <span className="font-semibold text-white">
                    Feature in Home 3D Hero Carousel
                  </span>
                </label>

                <div>
                  <label className="block font-medium text-zinc-300">
                    Available US Sizes
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {DEFAULT_SIZE_CHOICES.map((sz) => {
                      const active = sSizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => toggleSizeOption(sz)}
                          className={`font-mono-tabular cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                            active
                              ? "border-amber-400 bg-amber-400 text-black"
                              : "border-white/15 bg-black/40 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Multi-Angle Upload Grid (Lateral required, others optional) */}
                <div className="rounded-2xl border border-white/15 bg-black/40 p-3.5">
                  <p className="mb-2.5 font-semibold text-white">
                    Shoe Angle Photos (Lateral Profile shown in Shop; all
                    uploaded angles shown in Detail View)
                  </p>
                  <AngleUploadGrid
                    localPreviews={localPreviews}
                    savedAngles={sAngles}
                    onSelectFile={(key, file) =>
                      void handleSelectAngleFile(key, file)
                    }
                  />
                </div>

                {!editingShoe && !sParentProductId && (
                  <div className="rounded-2xl border border-white/15 bg-black/40 p-3.5">
                    <label className="flex cursor-pointer items-center justify-between gap-2">
                      <span className="font-semibold text-amber-200">
                        + Add a 2nd Colorway Version for this Shoe
                      </span>
                      <input
                        type="checkbox"
                        checked={addSecondColorway}
                        onChange={(e) => setAddSecondColorway(e.target.checked)}
                        className="accent-amber-400"
                      />
                    </label>

                    {addSecondColorway && (
                      <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="sm:col-span-2">
                            <label className="block font-medium text-zinc-300">
                              2nd Colorway Name *
                            </label>
                            <input
                              type="text"
                              required={addSecondColorway}
                              value={s2Colorway}
                              onChange={(e) => setS2Colorway(e.target.value)}
                              placeholder="e.g. Triple Black / Crimson"
                              className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-zinc-300">
                              Stock *
                            </label>
                            <input
                              type="number"
                              required={addSecondColorway}
                              min={0}
                              value={s2Stock}
                              onChange={(e) => setS2Stock(e.target.value)}
                              className="font-mono-tabular mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-[11px] font-medium text-zinc-300">
                            2nd Colorway Photos (Lateral Profile required; room
                            color auto-extracted from photo)
                          </p>
                          <AngleUploadGrid
                            localPreviews={s2LocalPreviews}
                            onSelectFile={handleSelectSecondAngleFile}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block font-medium text-zinc-300">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={sDescription}
                    onChange={(e) => setSDescription(e.target.value)}
                    placeholder="Cushioning, outsole traction, fit notes..."
                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingShoe}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-amber-400 py-3.5 text-xs font-bold tracking-widest text-black uppercase hover:bg-amber-300 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  <span>
                    {isSavingShoe
                      ? "Uploading & Saving..."
                      : editingShoe
                        ? "Update Shoe"
                        : "Save Shoe to Catalog"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
