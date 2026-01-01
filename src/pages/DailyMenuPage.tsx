import { useEffect, useState } from "react";
import * as prismic from "@prismicio/client";
import { client } from "../prismicClient";
import type { DailyMenu, Dish, MenuTemplate } from "../types";
import { generateDailyMenuCanvas } from "../utils/canvasDaily";
import { ShareButtons } from "../components/ShareButtons";

export function DailyMenuPage() {
  const [menu, setMenu] = useState<DailyMenu | null>(null);
  const [dishMap, setDishMap] = useState<Record<string, Dish>>({});
  const [templates, setTemplates] = useState<MenuTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

  // 1) Chargement menu du jour + templates
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const today = new Date();
        const iso = today.toISOString().slice(0, 10); // YYYY-MM-DD

        const [menuRes, templatesRes] = await Promise.all([
          client.get({
            filters: [
              prismic.filter.at("document.type", "daily_menu"),
              prismic.filter.at("my.daily_menu.date", iso)
            ],
            pageSize: 1
          }),
          client.get({
            filters: [prismic.filter.at("document.type", "menu_template")],
            pageSize: 100
          })
        ]);

        const doc = menuRes.results[0] as any;
        if (!doc) {
          setMenu(null);
          setDishMap({});
          setImageUrl(null);
          setImageFile(null);
        } else {
          setMenu(doc);

          const ids: string[] = [];
          if (doc.data.starter?.id) ids.push(doc.data.starter.id);
          if (doc.data.main?.id) ids.push(doc.data.main.id);
          if (doc.data.dessert?.id) ids.push(doc.data.dessert.id);

          const dishesDocs = ids.length
            ? await client.getByIDs(ids, { pageSize: ids.length })
            : { results: [] };

          const map: Record<string, Dish> = {};
          for (const d of dishesDocs.results as any) map[d.id] = d;
          setDishMap(map);
        }

        const tpls = templatesRes.results as unknown as MenuTemplate[];        setTemplates(tpls);
        if (!selectedTemplateId && tpls.length > 0) {
          setSelectedTemplateId(tpls[0].id);
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

  // 2) Regénérer l'image quand menu / plats / template changent
  useEffect(() => {
    const build = async () => {
      if (!menu) return;
      if (Object.keys(dishMap).length === 0) return;

      const template =
        templates.find((t) => t.id === selectedTemplateId) ?? templates[0];

      const canvas = await generateDailyMenuCanvas(menu, dishMap, template);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-du-jour.png", { type: "image/png" });
        setImageFile(file);
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      });
    };

    build();
  }, [menu, dishMap, templates, selectedTemplateId]);

  if (loading) return <p>Chargement du menu du jour…</p>;
  if (!menu) return <p>Aucun menu du jour publié pour aujourd&apos;hui.</p>;

  return (
    <div>
      {templates.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="template-select" style={{ marginRight: "0.5rem" }}>
            Template :
          </label>
          <select
            id="template-select"
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
            alt="Menu du jour"
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
