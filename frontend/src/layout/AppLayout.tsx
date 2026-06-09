import { Outlet } from "react-router";
import CommandAssistant from "../components/assistant/CommandAssistant";
import CommandAssistantFab from "../components/assistant/CommandAssistantFab";
import AppTutorial from "../components/tutorial/AppTutorial";
import { CommandAssistantProvider } from "../context/CommandAssistantContext";
import { TutorialProvider } from "../context/TutorialContext";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          <Outlet />
        </div>
        <CommandAssistantFab />
        <CommandAssistant />
        <AppTutorial />
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <TutorialProvider>
      <CommandAssistantProvider>
        <SidebarProvider>
          <LayoutContent />
        </SidebarProvider>
      </CommandAssistantProvider>
    </TutorialProvider>
  );
};

export default AppLayout;
