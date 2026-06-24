import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import TipAnimatedLogo from "../components/brand/TipAnimatedLogo";
import { filterNavItems } from "../config/navByRole";
import { useSidebar } from "../context/SidebarContext";
import { useTipAuth } from "../context/TipAuthContext";
import { useTranslation } from "../i18n/useTranslation";
import DocumentsSidebarWidget from "./DocumentsSidebarWidget";
import { buildNavItemDefs } from "./buildNavItems";

type RenderNavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  tourId?: string;
  subItems?: { name: string; path: string; tourId?: string }[];
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { isAdmin, hasRole } = useTipAuth();
  const { t } = useTranslation();
  const location = useLocation();

  const navItems: RenderNavItem[] = useMemo(() => {
    const defs = filterNavItems(buildNavItemDefs(t), hasRole);
    return defs.map((item) => ({
      name: item.name,
      icon: item.icon,
      path: item.path,
      tourId: item.tourId,
      subItems: item.subItems?.map((sub) => ({
        name: sub.name,
        path: sub.path,
        tourId: sub.tourId,
      })),
    }));
  }, [hasRole, isAdmin, t]);

  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname],
  );

  useEffect(() => {
    let submenuMatched = false;
    navItems.forEach((nav, index) => {
      nav.subItems?.forEach((subItem) => {
        if (
          isActive(subItem.path) ||
          location.pathname.startsWith(`${subItem.path}/`)
        ) {
          setOpenSubmenu(index);
          submenuMatched = true;
        }
      });
      if (nav.subItems && location.pathname.startsWith("/documents")) {
        setOpenSubmenu(index);
        submenuMatched = true;
      }
      if (nav.subItems && location.pathname.startsWith("/admin")) {
        setOpenSubmenu(index);
        submenuMatched = true;
      }
    });
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive, navItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = String(openSubmenu);
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu((prev) => (prev === index ? null : index));
  };

  const renderMenuItems = (items: RenderNavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              type="button"
              data-tour={nav.tourId}
              onClick={() => handleSubmenuToggle(index)}
              className={`menu-item group ${
                openSubmenu === index ? "menu-item-active" : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size ${
                  openSubmenu === index ? "menu-item-icon-active" : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDown
                  className={`ml-auto size-5 transition-transform duration-200 ${
                    openSubmenu === index ? "rotate-180 text-brand-500" : ""
                  }`}
                  strokeWidth={1.75}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                data-tour={nav.tourId}
                className={`menu-item group ${
                  isActive(nav.path) ||
                  (nav.path.startsWith("/documents") && location.pathname.startsWith("/documents"))
                    ? "menu-item-active"
                    : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isActive(nav.path) ||
                    (nav.path.startsWith("/documents") && location.pathname.startsWith("/documents"))
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[String(index)] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height: openSubmenu === index ? `${subMenuHeight[String(index)]}px` : "0px",
              }}
            >
              <ul className="ml-9 mt-2 space-y-1">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      data-tour={subItem.tourId}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const showGuidesWidget =
    isAdmin ||
    hasRole("support_administratif") ||
    hasRole("controle_procedure") ||
    hasRole("validateur");

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/dashboard" className="block px-3 py-1">
          {isExpanded || isHovered || isMobileOpen ? (
            <TipAnimatedLogo size="md" showWordmark animate />
          ) : (
            <TipAnimatedLogo size="xs" iconOnly animate />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  t("nav.menu")
                ) : (
                  <MoreHorizontal className="size-6" strokeWidth={1.75} />
                )}
              </h2>
              {renderMenuItems(navItems)}
            </div>
          </div>
        </nav>
        {showGuidesWidget && (isExpanded || isHovered || isMobileOpen) ? (
          <DocumentsSidebarWidget />
        ) : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
