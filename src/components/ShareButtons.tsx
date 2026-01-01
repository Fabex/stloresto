type Props = {
  file: File | null;
};

async function shareImage(file: File) {
  const n = navigator as any;

  if (n.canShare && n.canShare({ files: [file] })) {
    await n.share({
      files: [file],
      title: "Menu du jour",
      text: "Voici le menu du jour du restaurant"
    });
  } else if (navigator.share) {
    await navigator.share({
      title: "Menu du jour",
      text: "Voici le menu du jour du restaurant",
      url: window.location.href
    });
  } else {
    // Fallback: téléchargement
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    alert("Image téléchargée : partage-la depuis ta galerie.");
  }
}

export function ShareButtons({ file }: Props) {
  const onShare = async () => {
    if (!file) return;
    try {
      await shareImage(file);
    } catch (e) {
      console.error(e);
      alert("Impossible de partager automatiquement.");
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
      <button onClick={onShare}>Partager</button>
      <button onClick={onDownload}>Télécharger</button>
    </div>
  );
}
