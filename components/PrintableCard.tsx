"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import GiftMotif from "@/components/GiftMotif";
import PrintCarousel from "@/components/PrintCarousel";
import { fontById } from "@/lib/occasions";
import { paletteStyle } from "@/lib/palettes";
import { DEFAULT_PRINT_MODEL_ID, printModelById, stepPrintModel } from "@/lib/printModels";
import {
  CTA_DEFAUT,
  PRINT_LIMITS,
  ecrirePrintTexts,
  lirePrintTexts,
  type PrintTexts,
} from "@/lib/printTexts";
import type { Theme } from "@/lib/types";

/**
 * Une feuille A4 paysage, pliée en deux : carte A5 portrait.
 *
 * Le panneau droit porte la couverture, le gauche le dos. On rabat le gauche
 * derrière le droit : le pli tombe à gauche, la couverture est devant, et
 * l'intérieur — non imprimé — s'ouvre comme un livre pour un mot écrit à la
 * main.
 *
 * Tout est dessiné en CSS et en SVG : rien à télécharger, et l'impression sort
 * nette à n'importe quelle taille. Les commandes disparaissent à l'impression.
 */
export default function PrintableCard({
  url,
  to,
  intro,
  title,
  signature,
  theme,
  backHref,
  variante = "page",
  slug,
}: {
  url: string;
  to: string;
  intro: string;
  title: string;
  signature: string;
  theme: Theme;
  /** Absent en encart : il n'y a nulle part ou revenir depuis l'ecran de fin. */
  backHref?: string;
  /**
   * « page » : la feuille occupe l'ecran, avec sa barre et son lien de retour.
   * « encart » : la meme feuille, posee dans une page qui a deja son propre fil
   * — l'ecran qui suit la creation. Le rendu imprime est identique ; seule la
   * chrome autour change.
   */
  variante?: "page" | "encart";
  /** Sert de cle au stockage des mots de la carte : un donneur en a plusieurs. */
  slug: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [modelId, setModelId] = useState(DEFAULT_PRINT_MODEL_ID);
  const modele = printModelById(modelId);

  /*
   * Les mots de la carte imprimee : ceux de la page-cadeau au depart, modifiables
   * ensuite. Une page qu'on ouvre au telephone et une carte qu'on tient dans la
   * main n'appellent pas la meme formule.
   */
  const defauts: PrintTexts = { to, intro, title, signature, cta: CTA_DEFAUT };
  const [mots, setMots] = useState<PrintTexts>(defauts);
  const [ouvert, setOuvert] = useState(false);

  /*
   * Relu apres le montage, jamais dans l'initialisation du `useState` :
   * `localStorage` n'existe pas au rendu serveur, et le lire la ferait diverger
   * l'hydratation.
   */
  useEffect(() => {
    const garde = lirePrintTexts(slug);
    if (garde) setMots(garde);
    // Les defauts changent avec la page, pas avec le rendu : slug seul suffit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function changer(champ: keyof PrintTexts, valeur: string) {
    setMots((prev) => {
      const suivant = { ...prev, [champ]: valeur };
      ecrirePrintTexts(slug, suivant);
      return suivant;
    });
  }

  function reinitialiser() {
    setMots(defauts);
    ecrirePrintTexts(slug, defauts);
  }

  useEffect(() => {
    QRCode.toString(url, {
      type: "svg",
      // La marge vient du CSS : la plage blanche autour du code fait office de
      // zone de silence, et la doubler ici retrecirait le code pour rien.
      margin: 0,
      // Q tolere 25 % de degradation contre 15 % pour M. Sur papier, le code
      // sera plie, manipule, parfois imprime a court d'encre.
      errorCorrectionLevel: "Q",
      color: { dark: "#1b1b1b", light: "#ffffff" },
    })
      .then(setSvg)
      .catch(() => setSvg(null));
  }, [url]);

  /*
   * La feuille garde ses dimensions reelles en millimetres — c'est la meme boite
   * qui part a l'impression. A l'ecran, on la reduit pour qu'elle tienne dans la
   * fenetre : le facteur se mesure, il ne se devine pas.
   */
  const cadre = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    const mesurer = () => {
      const feuille = el.querySelector<HTMLElement>(".feuille");
      if (!feuille) return;
      // `offsetWidth` ignore le transform deja applique : c'est la largeur reelle.
      setZoom(el.clientWidth / feuille.offsetWidth);
    };
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);

  const skin = {
    ...paletteStyle(theme.palette),
    "--font-title": fontById(theme.font).cssVar,
    "--zoom": zoom,
  } as React.CSSProperties;

  return (
    <div className={`print-page${variante === "encart" ? " print-page--encart" : ""}`}>
      <div className="print-bar">
        {backHref && (
          <Link className="btn btn--ghost btn--sm" href={backHref}>
            ← Retour
          </Link>
        )}
        <p>
          Feuille A4, pliée en deux. Rabats la moitié gauche derrière la droite : la couverture se
          retrouve devant, le QR code au dos.
        </p>
        <button type="button" className="btn btn--sm" onClick={() => window.print()}>
          Imprimer
        </button>
      </div>

      <PrintCarousel
        modelId={modelId}
        onStep={(pas) => setModelId((prev) => stepPrintModel(prev, pas))}
      />

      {/*
        Les mots de la carte, replies par defaut : neuf fois sur dix ceux de la
        page conviennent, et un formulaire ouvert d'office ferait croire qu'il y
        a quelque chose a remplir avant d'imprimer.

        Masque a l'impression avec la barre et le carrousel : rien de tout ceci
        ne part sur le papier.
      */}
      <div className="mots-carte">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          aria-expanded={ouvert}
          onClick={() => setOuvert((v) => !v)}
        >
          {ouvert ? "Masquer les mots" : "Modifier les mots de la carte"}
        </button>

        {ouvert && (
          <div className="mots-carte__corps">
            <p className="mots-carte__aide">
              Ils reprennent ceux de la page-cadeau, et s&apos;en détachent dès que tu y touches. La
              page, elle, ne bouge pas. Gardés sur cet appareil, jamais envoyés.
            </p>

            <label className="mots-carte__champ">
              <span>Destinataire</span>
              <input
                type="text"
                value={mots.to}
                maxLength={PRINT_LIMITS.to}
                placeholder="Sophie"
                onChange={(e) => changer("to", e.target.value)}
              />
            </label>

            <label className="mots-carte__champ">
              <span>Mot d&apos;ouverture</span>
              <input
                type="text"
                value={mots.intro}
                maxLength={PRINT_LIMITS.intro}
                placeholder="Joyeux anniversaire"
                onChange={(e) => changer("intro", e.target.value)}
              />
            </label>

            <label className="mots-carte__champ">
              <span>Titre</span>
              <textarea
                rows={2}
                value={mots.title}
                maxLength={PRINT_LIMITS.title}
                onChange={(e) => changer("title", e.target.value)}
              />
            </label>

            <label className="mots-carte__champ">
              <span>Signature</span>
              <input
                type="text"
                value={mots.signature}
                maxLength={PRINT_LIMITS.signature}
                placeholder="Avec toute mon affection, Nathan"
                onChange={(e) => changer("signature", e.target.value)}
              />
            </label>

            <label className="mots-carte__champ">
              <span>Ligne sous le QR code</span>
              <input
                type="text"
                value={mots.cta}
                maxLength={PRINT_LIMITS.cta}
                placeholder={CTA_DEFAUT}
                onChange={(e) => changer("cta", e.target.value)}
              />
            </label>

            <button type="button" className="btn btn--ghost btn--sm" onClick={reinitialiser}>
              Reprendre les mots de la page
            </button>
          </div>
        )}
      </div>

      <div className="feuille-cadre" ref={cadre}>
        <div className={`feuille feuille--${modele.composition}`} style={skin}>
          <span className="feuille__pli feuille__pli--haut" aria-hidden="true" />
          <span className="feuille__pli feuille__pli--bas" aria-hidden="true" />

          {/* Panneau gauche : le dos, visible en retournant la carte. */}
          <div className="feuille__panneau feuille__dos">
            <GiftMotif kind={modele.motif} />
            <div className="feuille__qr">
              {svg ? (
                // SVG produit a l'instant par la bibliotheque, a partir de notre
                // propre URL : rien d'exterieur n'entre dans cette chaine.
                <div dangerouslySetInnerHTML={{ __html: svg }} />
              ) : (
                <div className="feuille__qr-vide" />
              )}
            </div>
            {mots.cta.trim() && <p className="feuille__cta">{mots.cta}</p>}
            {mots.signature.trim() && <p className="feuille__signature">{mots.signature}</p>}
          </div>

          {/* Panneau droit : la couverture, devant une fois pliee. */}
          <div className="feuille__panneau feuille__couv">
            <GiftMotif kind={modele.motif} />
            {mots.to.trim() && <p className="feuille__to">Pour {mots.to}</p>}
            {mots.intro.trim() && <p className="feuille__intro">{mots.intro}</p>}
            <h1 className="feuille__titre">{mots.title}</h1>
          </div>
        </div>
      </div>
    </div>
  );
}
