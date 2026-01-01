import { useEffect, useState } from "react";
import * as prismic from "@prismicio/client";
import { client } from "../prismicClient";
import type { Dish, WeeklyHighlights, MenuTemplate } from "../types";
import { generateWeeklyCanvas } from "../utils/canvasWeekly";
import { ShareButtons } from "../components/ShareButtons";

export function WeeklyHighlightsPage() {
  const [weekly, setWeekly] = useState<WeeklyHighlights | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [templates, setTemplates] = useState<MenuTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

  // 1) Charger le dernier weekly_highlights + les templates
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [weeklyRes, templatesRes] = await Promise.all([
          client.get({
            filters: [prismic.filter.at("document.type", "weekly_highlights")],
            orderings: [{ field: "my.weekly_highlights.week_start", direction: "desc" }],
            pageSize: 1
          }),
          client.get({
            filters: [prismic.filter.at("document.type", "menu_template")],
            pageSize: 100
          })
        ]);

        const doc = weeklyRes.results[0] as any;
        if (!doc) {
          setWeekly(null);
          setDishes([]);
          setImageUrl(null);
          setImageFile(null);
        } else {
          setWeekly(doc);

          // Récupérer les plats liés
          const dishIds: string[] = [];
          for (const item of doc.data.dishes as any[]) {
            if (item.dish?.id) dishIds.push(item.dish.id);
          }

          const dishesRes = dishIds.length
            ? await client.getByIDs(dishIds, { pageSize: dishIds.length })
            : { results: [] };

          setDishes(dishesRes.results as Dish[]);
        }

        // Filtrer les templates qui s'appliquent à weekly (ou both / null)
        const allTemplates = templatesRes.results as unknown as MenuTemplate[];        const filtered = allTemplates.filter(
          (t) =>
            t.data.applies_to === "weekly" ||
            t.data.applies_to === "both" ||
            !t.data.applies_to
        );
        setTemplates(filtered);

        if (!selectedTemplateId && filtered.length > 0) {
          setSelectedTemplateId(filtered[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Regénérer l'image à chaque changement de weekly / dishes / template
  useEffect(() => {
    const build = async () => {
      if (!weekly) return;
      if (dishes.length === 0) return;

      const template =
        templates.find((t) => t.id === selectedTemplateId) ?? templates[0];

      const canvas = await generateWeeklyCanvas(weekly, dishes, template);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], "plats-de-la-semaine.png", { type: "image/png" });
        setImageFile(file);
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      });
    };

    build();
  }, [weekly, dishes, templates, selectedTemplateId]);

  if (loading) return <p>Chargement des plats de la semaine…</p>;
  if (!weekly) return <p>Aucun “plats de la semaine” publié.</p>;

  return (
    <div style={{ marginTop: "2rem" }}>
      {templates.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="weekly-template-select" style={{ marginRight: "0.5rem" }}>
            Template :
          </label>
          <select
            id="weekly-template-select"
            value={selectedTemplateId ?? (templates[0]?.id ?? "")}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.data.name || "Template sans nom"}
              </option>
            ))}
          </select>
        </div>
      )}

      {imageUrl && (
        <>
          <img
            src={imageUrl}
            alt="Plats de la semaine"
            style={{
              maxWidth: "100%",
              borderRadius: "16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
            }}
          />
          <ShareButtons file={imageFile} />
        </>
      )}
    </div>
  );
}
