import { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useTranslation } from "@/contexts/TranslationContext";
import Permissions from "@/lib/permissions";
import axios from "axios";
import type {
  NavigationItem,
  PluginSidebarItem,
  PluginSidebarResponse,
} from "@/types/navigation";
import {
  Home,
  Server,
  User,
  ShieldCheck,
  Settings,
  Activity,
  BookOpen,
  Ticket,
  BarChart3,
  Crown,
  Key,
  Globe,
  Link,
  Newspaper,
  ImageIcon,
  FileText,
  Gauge,
  PlayCircle,
  Package,
  Cloud,
  Bot,
  Bell,
  Download,
  Database,
  Users,
  SquareTerminal,
  Calendar,
  Archive,
  Network,
  ArrowRightLeft,
  Upload,
  Clock,
  Folder,
} from "lucide-react";
import { isEnabled } from "@/lib/utils";

// Cache plugin routes outside hook to persist across re-renders
let cachedPluginRoutes: PluginSidebarResponse["data"]["sidebar"] | null = null;

export function useNavigation() {
  const pathname = usePathname();
  const { hasPermission } = useSession();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const [pluginRoutes, setPluginRoutes] = useState<
    PluginSidebarResponse["data"]["sidebar"] | null
  >(cachedPluginRoutes);

  useEffect(() => {
    const fetchPluginRoutes = async () => {
      if (cachedPluginRoutes) return;

      try {
        const { data } = await axios
          .get<PluginSidebarResponse>("/api/system/plugin-sidebar")
          .catch(() => ({ data: { success: false, data: null } }));
        if (data.success && data.data?.sidebar) {
          cachedPluginRoutes = data.data.sidebar;
          setPluginRoutes(data.data.sidebar);
        }
      } catch (error) {
        console.error("Failed to fetch plugin sidebar", error);
      }
    };

    fetchPluginRoutes();
  }, []);

  const convertPluginItems = useCallback(
    (
      pluginItems: Record<string, PluginSidebarItem>,
      category: "main" | "admin" | "server"
    ): NavigationItem[] => {
      return Object.entries(pluginItems)
        .map(([url, item]) => {
          // Build full URL based on category
          let prefix = "";
          if (category === "admin") prefix = "/admin";
          if (category === "main") prefix = "/dashboard";
          if (category === "server") prefix = "/server";

          const cleanUrl = url.startsWith("/") ? url : `/${url}`;
          const fullUrl = `${prefix}${cleanUrl}`;

          // Allow plugins to override redirect
          const cleanRedirect = item.redirect
            ? item.redirect.startsWith("/")
              ? item.redirect
              : `/${item.redirect}`
            : null;
          const fullRedirect = cleanRedirect
            ? `${prefix}${cleanRedirect}`
            : fullUrl;

          // Legacy-style group normalization
          const builtInGroups: Record<string, string[]> = {
            server: [
              "management",
              "files",
              "networking",
              "automation",
              "configuration",
            ],
            admin: [
              "overview",
              "feathercloud",
              "users",
              "tickets",
              "networking",
              "infrastructure",
              "content",
              "system",
            ],
            main: ["overview", "support"],
          };

          let normalizedGroup = item.group || "plugins";
          if (item.group) {
            const lowerGroup = item.group.toLowerCase();
            const matchingBuiltIn = builtInGroups[category]?.find(
              (bg) => bg.toLowerCase() === lowerGroup
            );
            if (matchingBuiltIn) {
              normalizedGroup = matchingBuiltIn;
            }
          }

          return {
            id: `plugin-${item.plugin}-${url}`,
            name: item.name,
            title: item.name,
            url: fullUrl,
            icon: item.icon,
            isActive:
              pathname === fullUrl || pathname.startsWith(fullUrl + "/"),
            category,
            isPlugin: true,
            pluginJs: item.js,
            pluginRedirect: fullRedirect,
            pluginName: item.pluginName,
            showBadge: item.showBadge,
            description: item.description,
            permission: item.permission,
            group: normalizedGroup,
          };
        })
        .filter((item) => {
          if (item.permission) {
            return hasPermission(item.permission);
          }
          return true;
        });
    },
    [pathname, hasPermission]
  );

  const navigationItems = useMemo(() => {
    const isAdmin = pathname.startsWith("/admin");
    const isServer = pathname.startsWith("/server/");
    const serverUuid = isServer ? pathname.split("/")[2] : null;

    if (isAdmin) {
      const items: NavigationItem[] = [
        // Overview
        {
          id: "admin-dashboard",
          name: t("navigation.items.dashboard"),
          title: t("landing.hero.title") || "Dashboard",
          url: "/admin",
          icon: Home,
          isActive: pathname === "/admin",
          category: "admin",
          permission: Permissions.ADMIN_DASHBOARD_VIEW,
          group: "overview",
        },
        {
          id: "admin-kpi-analytics",
          name: t("navigation.items.analytics"),
          title: t("navigation.items.analytics"),
          url: "/admin/kpi/analytics",
          icon: BarChart3,
          isActive: pathname.startsWith("/admin/kpi"),
          category: "admin",
          permission: Permissions.ADMIN_USERS_VIEW,
          group: "overview",
        },
        {
          id: "admin-nodes-status",
          name: t("navigation.items.nodeStatus"),
          title: t("navigation.items.nodeStatus"),
          url: "/admin/nodes/status",
          icon: Activity,
          isActive: pathname === "/admin/nodes/status",
          category: "admin",
          permission: Permissions.ADMIN_NODES_VIEW,
          group: "overview",
        },
        // User Management
        {
          id: "admin-users",
          name: t("navigation.items.users"),
          title: t("navigation.items.users"),
          url: "/admin/users",
          icon: Users,
          isActive: pathname.startsWith("/admin/users"),
          category: "admin",
          permission: Permissions.ADMIN_USERS_VIEW,
          group: "users",
        },
        {
          id: "admin-notifications",
          name: t("navigation.items.notifications"),
          title: t("navigation.items.notifications"),
          url: "/admin/notifications",
          icon: Bell,
          isActive: pathname.startsWith("/admin/notifications"),
          category: "admin",
          permission: Permissions.ADMIN_NOTIFICATIONS_VIEW,
          group: "users",
        },
        {
          id: "admin-roles",
          name: t("navigation.items.roles"),
          title: t("navigation.items.roles"),
          url: "/admin/roles",
          icon: Crown,
          isActive: pathname.startsWith("/admin/roles"),
          category: "admin",
          permission: Permissions.ADMIN_ROLES_VIEW,
          group: "users",
        },
        // Infrastructure
        {
          id: "admin-servers",
          name: t("navigation.items.servers"),
          title: t("navigation.items.servers"),
          url: "/admin/servers",
          icon: Server,
          isActive: pathname.startsWith("/admin/servers"),
          category: "admin",
          permission: Permissions.ADMIN_SERVERS_VIEW,
          group: "infrastructure",
        },
        {
          id: "admin-locations",
          name: t("navigation.items.locations"),
          title: t("navigation.items.locations"),
          url: "/admin/locations",
          icon: Globe,
          isActive: pathname.startsWith("/admin/locations"),
          category: "admin",
          permission: Permissions.ADMIN_LOCATIONS_VIEW,
          group: "infrastructure",
        },
        {
          id: "admin-subdomains",
          name: t("navigation.items.subdomains"),
          title: t("navigation.items.subdomains"),
          url: "/admin/subdomains",
          icon: Link,
          isActive: pathname.startsWith("/admin/subdomains"),
          category: "admin",
          permission: Permissions.ADMIN_SUBDOMAINS_VIEW,
          group: "infrastructure",
        },
        {
          id: "admin-realms",
          name: t("navigation.items.realms"),
          title: t("navigation.items.realms"),
          url: "/admin/realms",
          icon: Newspaper,
          isActive: pathname.startsWith("/admin/realms"),
          category: "admin",
          permission: Permissions.ADMIN_REALMS_VIEW,
          group: "infrastructure",
        },
        {
          id: "admin-featherzerotrust",
          name: t("navigation.items.zeroTrust"),
          title: t("navigation.items.zeroTrust"),
          url: "/admin/featherzerotrust",
          icon: ShieldCheck,
          isActive: pathname.startsWith("/admin/featherzerotrust"),
          category: "admin",
          permission: Permissions.ADMIN_FEATHERZEROTRUST_VIEW,
          group: "infrastructure",
        },
        // Content
        {
          id: "admin-images",
          name: t("navigation.items.images"),
          title: t("navigation.items.images"),
          url: "/admin/images",
          icon: ImageIcon,
          isActive: pathname.startsWith("/admin/images"),
          category: "admin",
          permission: Permissions.ADMIN_IMAGES_VIEW,
          group: "content",
        },
        {
          id: "admin-mail-templates",
          name: t("navigation.items.mailTemplates"),
          title: t("navigation.items.mailTemplates"),
          url: "/admin/mail-templates",
          icon: FileText,
          isActive: pathname.startsWith("/admin/mail-templates"),
          category: "admin",
          permission: Permissions.ADMIN_TEMPLATE_EMAIL_VIEW,
          group: "content",
        },
        {
          id: "admin-feathercloud-ai-agent",
          name: t("navigation.items.aiAgent"),
          title: t("navigation.items.aiAgent"),
          url: "/admin/featherpanel-ai-agent",
          icon: Bot,
          isActive: pathname.startsWith("/admin/featherpanel-ai-agent"),
          category: "admin",
          permission: Permissions.ADMIN_STATISTICS_VIEW,
          group: "content",
        },
        {
          id: "admin-redirect-links",
          name: t("navigation.items.redirectLinks"),
          title: t("navigation.items.redirectLinks"),
          url: "/admin/redirect-links",
          icon: Link,
          isActive: pathname.startsWith("/admin/redirect-links"),
          category: "admin",
          permission: Permissions.ADMIN_REDIRECT_LINKS_VIEW,
          group: "content",
        },
        // System
        {
          id: "admin-api-keys",
          name: t("navigation.items.apiKeys"),
          title: t("navigation.items.apiKeys"),
          url: "/admin/api-keys",
          icon: Key,
          isActive: pathname.startsWith("/admin/api-keys"),
          category: "admin",
          permission: Permissions.ADMIN_DASHBOARD_VIEW,
          group: "system",
        },
        {
          id: "admin-settings",
          name: t("navigation.items.settings"),
          title: t("navigation.items.settings"),
          url: "/admin/settings",
          icon: Settings,
          isActive: pathname.startsWith("/admin/settings"),
          category: "admin",
          permission: Permissions.ADMIN_SETTINGS_VIEW,
          group: "system",
        },
        {
          id: "admin-rate-limits",
          name: t("navigation.items.rateLimits"),
          title: t("navigation.items.rateLimits"),
          url: "/admin/rate-limits",
          icon: Gauge,
          isActive: pathname.startsWith("/admin/rate-limits"),
          category: "admin",
          permission: Permissions.ADMIN_SETTINGS_VIEW,
          group: "system",
        },
        {
          id: "admin-plugins",
          name: t("navigation.items.plugins"),
          title: t("navigation.items.plugins"),
          url: "/admin/plugins",
          icon: PlayCircle,
          isActive: pathname.startsWith("/admin/plugins"),
          category: "admin",
          permission: Permissions.ADMIN_PLUGINS_VIEW,
          group: "system",
        },
        {
          id: "admin-database-management",
          name: t("navigation.items.databaseManagement"),
          title: t("navigation.items.databaseManagement"),
          url: "/admin/databases/management",
          icon: Database,
          isActive: pathname.startsWith("/admin/databases/management"),
          category: "admin",
          permission: Permissions.ADMIN_DATABASES_VIEW,
          group: "system",
        },
        {
          id: "admin-pterodactyl-importer",
          name: t("navigation.items.pterodactylImporter"),
          title: t("navigation.items.pterodactylImporter"),
          url: "/admin/pterodactyl-importer",
          icon: Download,
          isActive: pathname.startsWith("/admin/pterodactyl-importer"),
          category: "admin",
          permission: Permissions.ADMIN_DATABASES_MANAGE,
          group: "system",
        },
        // FeatherCloud
        {
          id: "admin-feathercloud-marketplace",
          name: t("navigation.items.marketplace"),
          title: t("navigation.items.marketplace"),
          url: "/admin/feathercloud/marketplace",
          icon: Package,
          isActive:
            pathname.startsWith("/admin/feathercloud/marketplace") ||
            pathname.startsWith("/admin/feathercloud/plugins") ||
            pathname.startsWith("/admin/feathercloud/spells"),
          category: "admin",
          permission: Permissions.ADMIN_PLUGINS_VIEW,
          group: "feathercloud",
        },
        {
          id: "admin-cloud-management",
          name: t("navigation.items.cloudManagement"),
          title: t("navigation.items.cloudManagement"),
          url: "/admin/cloud-management",
          icon: Cloud,
          isActive: pathname.startsWith("/admin/cloud-management"),
          category: "admin",
          permission: Permissions.ADMIN_ROOT,
          group: "feathercloud",
        },
      ];

      if (isEnabled(settings?.knowledgebase_enabled)) {
        items.push({
          id: "admin-knowledgebase",
          name: t("navigation.items.knowledgebase"),
          title: t("navigation.items.knowledgebase"),
          url: "/admin/knowledgebase/categories",
          icon: BookOpen,
          isActive: pathname.startsWith("/admin/knowledgebase"),
          category: "admin",
          permission: Permissions.ADMIN_KNOWLEDGEBASE_CATEGORIES_VIEW,
          group: "users",
        });
      }

      if (isEnabled(settings?.ticket_system_enabled)) {
        items.push(
          {
            id: "admin-tickets",
            name: t("navigation.items.tickets"),
            title: t("navigation.items.tickets"),
            url: "/admin/tickets",
            icon: Ticket,
            isActive:
              pathname.startsWith("/admin/tickets") &&
              !pathname.startsWith("/admin/tickets/categories") &&
              !pathname.startsWith("/admin/tickets/priorities") &&
              !pathname.startsWith("/admin/tickets/statuses"),
            category: "admin",
            permission: Permissions.ADMIN_TICKETS_VIEW,
            group: "tickets",
          },
          {
            id: "admin-ticket-categories",
            name: t("navigation.items.ticketCategories"),
            title: t("navigation.items.ticketCategories"),
            url: "/admin/tickets/categories",
            icon: Ticket,
            isActive: pathname.startsWith("/admin/tickets/categories"),
            category: "admin",
            permission: Permissions.ADMIN_TICKET_CATEGORIES_VIEW,
            group: "tickets",
          },
          {
            id: "admin-ticket-priorities",
            name: t("navigation.items.ticketPriorities"),
            title: t("navigation.items.ticketPriorities"),
            url: "/admin/tickets/priorities",
            icon: Ticket,
            isActive: pathname.startsWith("/admin/tickets/priorities"),
            category: "admin",
            permission: Permissions.ADMIN_TICKET_PRIORITIES_VIEW,
            group: "tickets",
          },
          {
            id: "admin-ticket-statuses",
            name: t("navigation.items.ticketStatuses"),
            title: t("navigation.items.ticketStatuses"),
            url: "/admin/tickets/statuses",
            icon: Ticket,
            isActive: pathname.startsWith("/admin/tickets/statuses"),
            category: "admin",
            permission: Permissions.ADMIN_TICKET_STATUSES_VIEW,
            group: "tickets",
          }
        );
      }

      // Add Plugin Admin Items
      if (pluginRoutes?.admin) {
        const pluginItems = convertPluginItems(pluginRoutes.admin, "admin");
        items.push(...pluginItems);
      }

      return items.filter(
        (item) => !item.permission || hasPermission(item.permission)
      );
    }

    if (isServer && serverUuid) {
      const items: NavigationItem[] = [
        // Management
        {
          id: "server-overview",
          name: t("navigation.items.console"),
          title: t("navigation.items.console"),
          url: `/server/${serverUuid}`,
          icon: SquareTerminal,
          isActive: pathname === `/server/${serverUuid}`,
          category: "server",
          group: "management",
        },
        {
          id: "server-logs",
          name: t("navigation.items.logs"),
          title: t("navigation.items.logs"),
          url: `/server/${serverUuid}/logs`,
          icon: FileText,
          isActive: pathname.startsWith(`/server/${serverUuid}/logs`),
          category: "server",
          group: "management",
          permission: "activity.read",
        },
        {
          id: "server-activities",
          name: t("navigation.items.activities"),
          title: t("navigation.items.activities"),
          url: `/server/${serverUuid}/activities`,
          icon: Clock,
          isActive: pathname.startsWith(`/server/${serverUuid}/activities`),
          category: "server",
          group: "management",
          permission: "activity.read",
        },
        // Files
        {
          id: "server-files",
          name: t("navigation.items.files"),
          title: t("navigation.items.files"),
          url: `/server/${serverUuid}/files`,
          icon: Folder,
          isActive: pathname.startsWith(`/server/${serverUuid}/files`),
          category: "server",
          group: "files",
          permission: "file.read",
        },
        {
          id: "server-databases",
          name: t("navigation.items.databases"),
          title: t("navigation.items.databases"),
          url: `/server/${serverUuid}/databases`,
          icon: Database,
          isActive: pathname.startsWith(`/server/${serverUuid}/databases`),
          category: "server",
          group: "files",
          permission: "database.read",
        },
        {
          id: "server-backups",
          name: t("navigation.items.backups"),
          title: t("navigation.items.backups"),
          url: `/server/${serverUuid}/backups`,
          icon: Archive,
          isActive: pathname.startsWith(`/server/${serverUuid}/backups`),
          category: "server",
          group: "files",
          permission: "backup.read",
        },
        {
          id: "server-import",
          name: t("navigation.items.import"),
          title: t("navigation.items.import"),
          url: `/server/${serverUuid}/import`,
          icon: Upload,
          isActive: pathname.startsWith(`/server/${serverUuid}/import`),
          category: "server",
          group: "files",
          permission: "import.read",
        },
        // Automation
        {
          id: "server-schedules",
          name: t("navigation.items.schedules"),
          title: t("navigation.items.schedules"),
          url: `/server/${serverUuid}/schedules`,
          icon: Calendar,
          isActive: pathname.startsWith(`/server/${serverUuid}/schedules`),
          category: "server",
          group: "automation",
          permission: "schedule.read",
        },
        // Configuration
        {
          id: "server-users",
          name: t("navigation.items.users"),
          title: t("navigation.items.users"),
          url: `/server/${serverUuid}/users`,
          icon: Users,
          isActive: pathname.startsWith(`/server/${serverUuid}/users`),
          category: "server",
          group: "configuration",
          permission: "user.read",
        },
        {
          id: "server-startup",
          name: t("navigation.items.startup"),
          title: t("navigation.items.startup"),
          url: `/server/${serverUuid}/startup`,
          icon: PlayCircle,
          isActive: pathname.startsWith(`/server/${serverUuid}/startup`),
          category: "server",
          group: "configuration",
          permission: "startup.read",
        },
        {
          id: "server-settings",
          name: t("navigation.items.settings"),
          title: t("navigation.items.settings"),
          url: `/server/${serverUuid}/settings`,
          icon: Settings,
          isActive: pathname.startsWith(`/server/${serverUuid}/settings`),
          category: "server",
          group: "configuration",
          permission: "settings.rename",
        },
        // Networking
        {
          id: "server-allocations",
          name: t("navigation.items.allocations"),
          title: t("navigation.items.allocations"),
          url: `/server/${serverUuid}/allocations`,
          icon: Network,
          isActive: pathname.startsWith(`/server/${serverUuid}/allocations`),
          category: "server",
          group: "networking",
          permission: "allocation.read",
        },
        {
          id: "server-firewall",
          name: t("navigation.items.firewall"),
          title: t("navigation.items.firewall"),
          url: `/server/${serverUuid}/firewall`,
          icon: ShieldCheck,
          isActive: pathname.startsWith(`/server/${serverUuid}/firewall`),
          category: "server",
          group: "networking",
          permission: "firewall.read",
        },
        {
          id: "server-proxy",
          name: t("navigation.items.proxy"),
          title: t("navigation.items.proxy"),
          url: `/server/${serverUuid}/proxy`,
          icon: ArrowRightLeft,
          isActive: pathname.startsWith(`/server/${serverUuid}/proxy`),
          category: "server",
          group: "networking",
          permission: "proxy.read",
        },
        {
          id: "server-subdomains",
          name: t("navigation.items.subdomains"),
          title: t("navigation.items.subdomains"),
          url: `/server/${serverUuid}/subdomains`,
          icon: Globe,
          isActive: pathname.startsWith(`/server/${serverUuid}/subdomains`),
          category: "server",
          group: "networking",
          permission: "subdomain.manage",
        },
      ];

      // Add Server Plugin Items
      if (pluginRoutes?.server) {
        const serverPlugins = convertPluginItems(pluginRoutes.server, "server");
        // Prefix server plugin URLs with the current server path
        serverPlugins.forEach((item) => {
          const subPath = item.url.startsWith("/server")
            ? item.url.replace("/server", "")
            : item.url;
          item.url = `/server/${serverUuid}${
            subPath.startsWith("/") ? subPath : "/" + subPath
          }`;
          if (item.pluginRedirect) {
            const redirectSubPath = item.pluginRedirect.startsWith("/server")
              ? item.pluginRedirect.replace("/server", "")
              : item.pluginRedirect;
            item.pluginRedirect = `/server/${serverUuid}${
              redirectSubPath.startsWith("/")
                ? redirectSubPath
                : "/" + redirectSubPath
            }`;
          }
        });
        items.push(...serverPlugins);
      }

      return items.filter(
        (item) => !item.permission || hasPermission(item.permission)
      );
    }

    // MAIN NAVIGATION
    const items: NavigationItem[] = [
      {
        id: "dashboard",
        name: t("navigation.items.dashboard"),
        title: t("landing.hero.title") || "Dashboard",
        url: "/dashboard",
        icon: Home,
        isActive: pathname === "/dashboard",
        category: "main",
        group: "overview",
      },
      {
        id: "servers",
        name: t("navigation.items.servers"),
        title: t("navigation.items.servers"),
        url: "/dashboard/servers",
        icon: Server,
        isActive: pathname.startsWith("/dashboard/servers"),
        category: "main",
        group: "overview",
      },
      {
        id: "account",
        name: t("navigation.items.account"),
        title: t("navigation.items.account"),
        url: "/dashboard/account",
        icon: User,
        isActive: pathname.startsWith("/dashboard/account"),
        category: "main",
        group: "account",
      },
    ];

    if (hasPermission(Permissions.ADMIN_DASHBOARD_VIEW)) {
      items.push({
        id: "admin",
        name: t("navigation.items.admin"),
        title: t("navbar.adminPanelTooltip"),
        url: "/admin",
        icon: ShieldCheck,
        isActive: pathname.startsWith("/admin"),
        category: "main",
        group: "overview",
      });
    }

    if (isEnabled(settings?.knowledgebase_enabled)) {
      items.push({
        id: "knowledgebase",
        name: t("navigation.items.knowledgebase"),
        title: t("navigation.items.knowledgebase"),
        url: "/dashboard/knowledgebase",
        icon: BookOpen,
        isActive: pathname.startsWith("/dashboard/knowledgebase"),
        category: "main",
        group: "support",
      });
    }

    if (isEnabled(settings?.ticket_system_enabled)) {
      items.push({
        id: "tickets",
        name: t("navigation.items.tickets"),
        title: t("navigation.items.tickets"),
        url: "/dashboard/tickets",
        icon: Ticket,
        isActive: pathname.startsWith("/dashboard/tickets"),
        category: "main",
        group: "support",
      });
    }

    if (isEnabled(settings?.status_page_enabled)) {
      items.push({
        id: "status",
        name: t("navigation.items.status"),
        title: t("navigation.items.status"),
        url: "/dashboard/status",
        icon: Activity,
        isActive: pathname.startsWith("/dashboard/status"),
        category: "main",
        group: "support",
      });
    }

    // Add Plugin Items
    if (pluginRoutes?.client) {
      const pluginItems = convertPluginItems(pluginRoutes.client, "main");
      items.push(...pluginItems);
    }

    return items;
  }, [pathname, hasPermission, pluginRoutes, convertPluginItems, settings, t]);

  return { navigationItems };
}
