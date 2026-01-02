import { useEffect, useState } from "react";
import * as prismic from "@prismicio/client";
import { client } from "../prismicClient";
import type { Dish, WeeklyHighlights, MenuTemplate } from "../types";
import { generateWeeklyCanvas } from "../utils/canvasWeekly";
import { ShareButtons } from "../components/ShareButtons";

export function WeeklyHighlightsPage() {
  const [weeks, setWeeks] = useState<WeeklyHighlights[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<WeeklyHighlights | null>(null);

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [templates, setTemplates] = useState<MenuTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * 1) Charger toutes les semaines + templates
   */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [weeksRes, templatesRes] = await Promise.all([
          client.get({
            filters: [prismic.filter.at("document.type", "weekly_highlights")],
            orderings: [
              {
                field: "my.weekly_highlights.week_start",
                direction: "desc",
              },
            ],
            pageSize: 100,
          }),
          client.get({
            filters: [prismic.filter.at("document.type", "menu_template")],
            pageSize: 100,
          }),
        ]);

        const weeksDocs = weeksRes.results as unknown as WeeklyHighlights[];
        setWeeks(weeksDocs);

        // Semaine par défaut = la plus récente
        if (weeksDocs.length > 0) {
          setSelectedWeekId(weeksDocs[0].id);
          setCurrentWeek(weeksDocs[0]);
        }

        const allTemplates = templatesRes.results as unknown as MenuTemplate[];
        const filteredTemplates = allTemplates.filter(
          (t) =>
            t.data.applies_to === "weekly" ||
            t.data.applies_to === "both" ||
            !t.data.applies_to
        );
        setTemplates(filteredTemplates);

        if (filteredTemplates.length > 0) {
          setSelectedTemplateId(filteredTemplates[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  /**
   * 2) Quand la semaine sélectionnée change → charger les plats
   */
  useEffect(() => {
    if (!selectedWeekId) return;

    const week = weeks.find((w) => w.id === selectedWeekId) || null;
    setCurrentWeek(week);

    if (!week) return;

    const loadDishes = async () => {
      try {
        const dishIds =
          week.data.dishes
            ?.map((item: any) => item.dish?.id)
            .filter(Boolean) || [];

        if (dishIds.length === 0) {
          setDishes([]);
          return;
        }

        const dishesRes = await client.getByIDs(dishIds, {
          pageSize: dishIds.length,
        });

        setDishes(dishesRes.results as unknown as Dish[]);
      } catch (e) {
        console.error(e);
      }
    };

    loadDishes();
  }, [selectedWeekId, weeks]);

  /**
   * 3) Regénérer l'image quand semaine / plats / template changent
   */
  useEffect(() => {
    const build = async () => {
      if (!currentWeek) return;
      if (dishes.length === 0) return;

      const template =
        templates.find((t) => t.id === selectedTemplateId) ?? templates[0];

      const canvas = await generateWeeklyCanvas(
        currentWeek,
        dishes,
        template
      );

      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], "plats-de-la-semaine.png", {
          type: "image/png",
        });
        setImageFile(file);
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      });
    };

    build();
  }, [currentWeek, dishes, templates, selectedTemplateId]);

  if (loading) return <p>Chargement des plats de la semaine…</p>;
  if (!weeks.length) return <p>Aucune semaine disponible.</p>;

  return (
    <div style={{ marginTop: "2rem" }}>
      {/* Sélecteur de semaine */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
        <div>
          <label style={{ marginRight: "0.5rem" }}>Semaine :</label>
          <select
            value={selectedWeekId ?? ""}
            onChange={(e) => setSelectedWeekId(e.target.value)}
          >
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.data.title ||
                  `${w.data.week_start} → ${w.data.week_end}`}
              </option>
            ))}
          </select>
        </div>

        {/* Sélecteur de template */}
        {templates.length > 0 && (
          <div>
            <label style={{ marginRight: "0.5rem" }}>Template :</label>
            <select
              value={selectedTemplateId ?? ""}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.data.name || "Template"}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Image */}
      {imageUrl && (
        <>
          <img
            src={imageUrl}
            alt="Plats de la semaine"
            style={{
              maxWidth: "100%",
              borderRadius: "16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            }}
          />
          <ShareButtons file={imageFile} />
        </>
      )}
    </div>
  );
}
