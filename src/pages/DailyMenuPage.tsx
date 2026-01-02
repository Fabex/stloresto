import { useEffect, useState } from "react";
import * as prismic from "@prismicio/client";
import { client } from "../prismicClient";
import type { DailyMenu, Dish, MenuTemplate } from "../types";
import { generateDailyMenuCanvas } from "../utils/canvasDaily";
import { ShareButtons } from "../components/ShareButtons";

function todayIso() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function DailyMenuPage() {
  const [selectedDate, setSelectedDate] = useState<string>(todayIso());

  const [menu, setMenu] = useState<DailyMenu | null>(null);
  const [dishes, setDishes] = useState<{
    starter?: Dish;
    main?: Dish;
    dessert?: Dish;
  }>({});

  const [templates, setTemplates] = useState<MenuTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [noMenu, setNoMenu] = useState(false);

  /**
   * 1) Charger les templates (une seule fois)
   */
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await client.get({
          filters: [prismic.filter.at("document.type", "menu_template")],
          pageSize: 100,
        });

        const allTemplates = res.results as unknown as MenuTemplate[];
        const filtered = allTemplates.filter(
          (t) =>
            t.data.applies_to === "daily" ||
            t.data.applies_to === "both" ||
            !t.data.applies_to
        );

        setTemplates(filtered);
        if (filtered.length > 0) {
          setSelectedTemplateId(filtered[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadTemplates();
  }, []);

  /**
   * 2) Charger le menu du jour pour la date sélectionnée
   */
  useEffect(() => {
    const loadMenu = async () => {
      try {
        setLoading(true);
        setNoMenu(false);
        setMenu(null);
        setImageUrl(null);
        setImageFile(null);

        const res = await client.get({
          filters: [
            prismic.filter.at("document.type", "daily_menu"),
            prismic.filter.at("my.daily_menu.date", selectedDate),
          ],
          pageSize: 1,
        });

        const doc = res.results[0] as unknown as DailyMenu | undefined;

        if (!doc) {
          setNoMenu(true);
          setMenu(null);
          setDishes({});
          return;
        }

        setMenu(doc);

        // Charger les plats liés
        const ids = [
          doc.data.starter?.id,
          doc.data.main?.id,
          doc.data.dessert?.id,
        ].filter(Boolean) as string[];

        if (ids.length === 0) {
          setDishes({});
          return;
        }

        const dishesRes = await client.getByIDs(ids, {
          pageSize: ids.length,
        });

        const map: Record<string, Dish> = {};
        for (const d of dishesRes.results as unknown as Dish[]) {
          map[d.id] = d;
        }

        setDishes({
          starter: map[doc.data.starter?.id ?? ""],
          main: map[doc.data.main?.id ?? ""],
          dessert: map[doc.data.dessert?.id ?? ""],
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadMenu();
  }, [selectedDate]);

  /**
   * 3) Regénérer l’image quand menu / plats / template changent
   */
  useEffect(() => {
    const build = async () => {
      if (!menu) return;
      if (!dishes.main) return;

      const template =
        templates.find((t) => t.id === selectedTemplateId) ?? templates[0];

      const dishMap: Record<string, Dish> = {};

      if (menu.data.starter?.id && dishes.starter) {
        dishMap[menu.data.starter.id] = dishes.starter;
      }
      if (menu.data.main?.id && dishes.main) {
        dishMap[menu.data.main.id] = dishes.main;
      }
      if (menu.data.dessert?.id && dishes.dessert) {
        dishMap[menu.data.dessert.id] = dishes.dessert;
      }

      const canvas = await generateDailyMenuCanvas(
        menu,
        dishMap,
        template
      );


      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-du-jour.png", {
          type: "image/png",
        });
        setImageFile(file);
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      });
    };

    build();
  }, [menu, dishes, templates, selectedTemplateId]);

  return (
    <div>
      {/* Sélecteurs */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
        {/* Date picker */}
        <div>
          <label style={{ marginRight: "0.5rem" }}>Date :</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {/* Template */}
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

      {/* États */}
      {loading && <p>Chargement du menu…</p>}
      {noMenu && <p>Aucun menu publié pour cette date.</p>}

      {/* Image */}
      {imageUrl && (
        <>
          <img
            src={imageUrl}
            alt="Menu du jour"
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
