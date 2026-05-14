import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface WorkflowStepsProps {
  assetType: string;
}

const WorkflowSteps = ({ assetType }: WorkflowStepsProps) => {
  const { t } = useLanguage();
  
  const workflows = {
    image: [
      t('workflow.image.step1'),
      t('workflow.image.step2'),
      t('workflow.image.step3'),
      t('workflow.image.step4'),
      t('workflow.image.step5'),
    ],
    code: [
      t('workflow.code.step1'),
      t('workflow.code.step2'),
      t('workflow.code.step3'),
      t('workflow.code.step4'),
      t('workflow.code.step5'),
    ],
    document: [
      t('workflow.document.step1'),
      t('workflow.document.step2'),
      t('workflow.document.step3'),
      t('workflow.document.step4'),
      t('workflow.document.step5'),
    ],
    audio: [
      t('workflow.audio.step1'),
      t('workflow.audio.step2'),
      t('workflow.audio.step3'),
      t('workflow.audio.step4'),
      t('workflow.audio.step5'),
    ],
  };

  const steps = assetType ? workflows[assetType as keyof typeof workflows] : null;

  if (!steps) return null;

  return (
    <Card className="mt-6 bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">{t('workflow.title')}</CardTitle>
        <CardDescription className="text-gray-400">
          {t('workflow.description').replace('{type}', assetType)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="bg-purple-400/10 rounded-full p-2">
                <span className="text-purple-400 font-bold">{index + 1}</span>
              </div>
              <div>
                <p className="text-white">{step}</p>
              </div>
            </div>
          ))}
          <div className="mt-6 flex justify-center">
            <button className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all">
              {t('workflow.start')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowSteps;