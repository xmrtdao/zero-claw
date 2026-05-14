import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Gavel, PiggyBank, FileText, MessageSquare, Coins } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface DaoTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

const DaoTabs = ({ activeTab, onTabChange }: DaoTabsProps) => {
  const { t } = useLanguage();
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full bg-gray-800 h-auto p-1">
        <TabsTrigger value="members" className="data-[state=active]:bg-gray-700 p-2 sm:p-3">
          <Users className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
          <span className="hidden sm:inline text-xs sm:text-sm">Members</span>
        </TabsTrigger>
        <TabsTrigger value="xmrt" className="data-[state=active]:bg-gray-700 p-2 sm:p-3">
          <Coins className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
          <span className="hidden sm:inline text-xs sm:text-sm">XMRT</span>
        </TabsTrigger>
        <TabsTrigger value="governance" className="data-[state=active]:bg-gray-700 p-2 sm:p-3">
          <Gavel className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
          <span className="hidden sm:inline text-xs sm:text-sm">Governance</span>
        </TabsTrigger>
        <TabsTrigger value="treasury" className="data-[state=active]:bg-gray-700 p-2 sm:p-3">
          <PiggyBank className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
          <span className="hidden sm:inline text-xs sm:text-sm">Treasury</span>
        </TabsTrigger>
        <TabsTrigger value="proposals" className="data-[state=active]:bg-gray-700 p-2 sm:p-3">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
          <span className="hidden sm:inline text-xs sm:text-sm">Proposals</span>
        </TabsTrigger>
        <TabsTrigger value="discussions" className="data-[state=active]:bg-gray-700 p-2 sm:p-3">
          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
          <span className="hidden sm:inline text-xs sm:text-sm">Discussions</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default DaoTabs;