"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Script } from "@/types/script";
import { ScriptAnalysisService } from "@/services/script-analysis";

interface Props {
  scriptId: string;
}

export default function ScriptDetails({ scriptId }: Props) {
  const { toast } = useToast();
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const scriptService = new ScriptAnalysisService();

  useEffect(() => {
    const fetchScriptDetails = async () => {
      try {
        const data = await scriptService.getScriptDetails(scriptId);
        setScript(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load script details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchScriptDetails();

    // Poll for updates if script is being analyzed
    const interval = setInterval(async () => {
      if (script?.analysisStatus === "processing") {
        const status = await scriptService.getAnalysisStatus(scriptId);
        if (status.status !== "processing") {
          fetchScriptDetails();
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [scriptId, script?.analysisStatus, toast]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!script) {
    return <div>Script not found</div>;
  }

  const handleAssignVoice = async (roleId: string) => {
    try {
      await scriptService.assignVoice(scriptId, roleId, "default-voice-id");
      toast({
        title: "Success",
        description: "Voice assigned successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign voice",
        variant: "destructive",
      });
    }
  };

  const handleRetryAnalysis = async () => {
    // Implementation for retrying analysis
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">{script.title}</h1>
      {script.description && (
        <p className="text-gray-600 mb-6">{script.description}</p>
      )}

      {script.analysisStatus === "processing" && (
        <Card className="p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Analysis in Progress</h2>
          <Progress value={script.analysisProgress} className="mb-2" />
          <p className="text-sm text-gray-500">
            Analyzing script... {script.analysisProgress}% complete
          </p>
        </Card>
      )}

      {script.analysisStatus === "completed" && (
        <Tabs defaultValue="roles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="scenes">Scenes</TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-4">
            {script.roles.map((role) => (
              <Card key={role.id} className="p-4">
                <h3 className="text-lg font-semibold mb-2">{role.name}</h3>
                <p className="text-gray-600 mb-2">
                  {role.characterDescription}
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleAssignVoice(role.id)}
                  >
                    {role.voiceId ? "Change Voice" : "Assign Voice"}
                  </Button>
                  <Button variant="outline">View Lines</Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="scenes" className="space-y-4">
            {script.scenes.map((scene) => (
              <Card key={scene.id} className="p-4">
                <h3 className="text-lg font-semibold mb-2">
                  Scene {scene.number}: {scene.title}
                </h3>
                <p className="text-gray-600 mb-2">{scene.description}</p>
                <p className="text-sm text-gray-500">
                  Location: {scene.location}
                </p>
                <p className="text-sm text-gray-500">
                  Characters: {scene.characters.join(", ")}
                </p>
                <Button variant="outline" className="mt-2">
                  Practice Scene
                </Button>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {script.analysisStatus === "failed" && (
        <Card className="p-4 bg-red-50">
          <h2 className="text-lg font-semibold text-red-600 mb-2">
            Analysis Failed
          </h2>
          <p className="text-red-500">
            There was an error analyzing your script. Please try uploading it
            again.
          </p>
          <Button
            variant="destructive"
            className="mt-4"
            onClick={handleRetryAnalysis}
          >
            Retry Analysis
          </Button>
        </Card>
      )}
    </div>
  );
}
