type Props = {
  file: File | null;
};

async function shareImage(file: File) {
  const n = navigator as any;

  // Navigateur qui supporte (au moins un peu) Web Share
  if (n.share) {
    try {
      // Si canShare existe et dit OK pour les fichiers
      if (n.canShare && n.canShare({ files: [file] })) {
        await n.share({
          files: [file],
          title: "Menu du jour",
          text: "Voici le menu du jour du restaurant"
        });
        return;
      }

      // Certains navigateurs supportent les fichiers mais n'implémentent pas bien canShare
      await n.share({
        files: [file],
        title: "Menu du jour",
        text: "Voici le menu du jour du restaurant"
      });
      return;
    } catch (e) {
      console.error("Erreur lors du partage de l'image :", e);
      // On tombera sur le fallback download juste après
    }
  }

  // Fallback : on télécharge l'image pour que l'utilisateur la partage depuis sa galerie
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
  alert(
    "Ton téléphone ne permet pas de partager l'image directement depuis le navigateur. " +
      "L'image a été téléchargée : tu peux maintenant la partager depuis ta galerie."
  );
}

export function ShareButtons({ file }: Props) {
  const onShare = async () => {
    if (!file) return;
    try {
      await shareImage(file);
    } catch (e) {
      console.error(e);
      alert("Impossible de partager l'image.");
    }
  };

  const onDownload = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
      <button onClick={onShare}>Partager l&apos;image</button>
      <button onClick={onDownload}>Télécharger</button>
    </div>
  );
}
