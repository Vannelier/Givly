"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import GiftMotif from "@/components/GiftMotif";
import PrintCarousel from "@/components/PrintCarousel";
import PrintColorSlider from "@/components/PrintColorSlider";
import PrintSlider from "@/components/PrintSlider";
import { styleDeTeinte, teinteDuTheme } from "@/lib/carteCouleur";
import { fontById, occasionById, type MotifKind } from "@/lib/occasions";
import { paletteStyle } from "@/lib/palettes";
import {
  DEFAULT_PRINT_LAYOUT,
  DEFAULT_PRINT_MOTIF,
  PRINT_LAYOUTS,
  printLayoutById,
  stepPrintMotif,
} from "@/lib/printModels";
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
/** La tuile telle que la page-cadeau la dessine. */
const MOTIF_ECHELLE_DEFAUT = 1;
/** L'opacite du decor avant qu'elle ne devienne reglable, dans `globals.css`. */
const MOTIF_OPACITE_DEFAUT = 0.11;

export default function PrintableCard({
  url,
  to,
  intro,
  title,
  signature,
  theme,
  backHref,
  slug,
}: {
  url: string;
  to: string;
  intro: string;
  title: string;
  signature: string;
  theme: Theme;
  /** Absent quand il n'y a nulle part ou revenir. */
  backHref?: string;
  /** Sert de cle au stockage des mots de la carte : un donneur en a plusieurs. */
  slug: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);

  /*
   * Trois reglages independants, la ou il y avait une liste de dix combinaisons
   * figees : la disposition, le pictogramme de fond, la couleur. Chacun a sa
   * commande, et les vingt-et-un croisements sont tous atteignables.
   */
  const [layout, setLayout] = useState<string>(DEFAULT_PRINT_LAYOUT);
  /*
   * Le decor part sur celui de l'occasion, pas sur « aucun ».
   *
   * C'est ce que porte deja la page-cadeau, donc c'est la carte assortie a ce
   * qu'on vient de composer — et c'est aussi ce que montre l'apercu de l'ecran
   * de fin, qui n'a pas de reglages. Les deux doivent s'accorder, sans quoi
   * « Carte a imprimer » ouvrirait une autre carte que celle annoncee.
   * `DEFAULT_PRINT_MOTIF` reste le repli des occasions sans decor.
   */
  const [motif, setMotif] = useState<MotifKind>(
    occasionById(theme.occasion).motif || DEFAULT_PRINT_MOTIF,
  );
  const teinteDefaut = teinteDuTheme(theme.palette);
  const [teinte, setTeinte] = useState(teinteDefaut);

  /*
   * La taille du decor et son contraste.
   *
   * `MOTIF_ECHELLE_DEFAUT` vaut 1 : la tuile telle que `GiftMotif` la dessine
   * pour la page-cadeau. En dessous le decor se resserre et se fait discret, au
   * dessus il s'espace et s'affirme.
   *
   * `MOTIF_OPACITE_DEFAUT` vaut 0,11, la valeur en dur dans `globals.css` avant
   * qu'elle ne devienne une variable : une carte qu'on n'a pas reglee sort
   * exactement comme avant. La borne haute s'arrete a 0,4 — au-dela le decor
   * concurrence le titre au lieu de l'accompagner, et sur une imprimante a jet
   * d'encre il boit le papier.
   */
  const [echelle, setEchelle] = useState(MOTIF_ECHELLE_DEFAUT);
  const [opacite, setOpacite] = useState(MOTIF_OPACITE_DEFAUT);
  const composition = printLayoutById(layout).id;

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
    // Apres la palette, jamais avant : le curseur a le dernier mot sur les
    // variables qu'il touche, et ne touche que celles-la.
    ...styleDeTeinte(theme.palette, teinte),
    "--font-title": fontById(theme.font).cssVar,
    "--motif-opacite": opacite,
    "--zoom": zoom,
  } as React.CSSProperties;

  return (
    <div className="print-page">
      <div className="print-bar">
        {backHref && (
          <Link className="btn btn--ghost btn--sm" href={backHref}>
            ← Retour
          </Link>
        )}
        {/*
          La consigne de pliage a quitte cette barre pour passer sous la carte.
          Elle occupait 118 px en tete de page au telephone, pour une phrase qu'on
          lit une fois — et elle repoussait d'autant l'objet dont elle parle.
        */}
        <button type="button" className="btn btn--sm" onClick={() => window.print()}>
          Imprimer
        </button>
      </div>

      {/*
        Deux colonnes sur grand ecran, deux etages au telephone — et dans les deux
        cas la carte et ses reglages sont a l'ecran en meme temps.

        Ils ne l'etaient jamais : la page empilait la barre, les reglages, les
        mots, puis la feuille, en une seule colonne. Mesure, il fallait defiler
        de 710 px au telephone et de 657 px sur un 1440 pour atteindre la carte,
        et le desktop laissait 62 % de sa largeur vide pour y arriver. On reglait
        a l'aveugle.
      */}
      <div className="print-atelier">
        <div className="print-scene">
          <div className="feuille-cadre" ref={cadre}>
            <div className={`feuille feuille--${composition}`} style={skin}>
              <span className="feuille__pli feuille__pli--haut" aria-hidden="true" />
              <span className="feuille__pli feuille__pli--bas" aria-hidden="true" />

              {/* Panneau gauche : le dos, visible en retournant la carte. */}
              <div className="feuille__panneau feuille__dos">
                <GiftMotif kind={motif} echelle={echelle} />
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
                <GiftMotif kind={motif} echelle={echelle} />
                {mots.to.trim() && <p className="feuille__to">Pour {mots.to}</p>}
                {mots.intro.trim() && <p className="feuille__intro">{mots.intro}</p>}
                <h1 className="feuille__titre">{mots.title}</h1>
              </div>
            </div>
          </div>

          <p className="print-legende">
            Feuille A4, pliée en deux. Rabats la moitié gauche derrière la droite : la couverture se
            retrouve devant, le QR code au dos.
          </p>
        </div>

        <div className="print-reglages">
      {/*
        Les trois reglages de l'habillage, groupes : on les parcourt du plus
        structurant au plus fin — la disposition, puis le decor, puis la couleur.
        Masques a l'impression avec le reste des commandes.
      */}
      <div className="habillage">
        <div className="dispositions" role="group" aria-label="Disposition de la carte">
          {PRINT_LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              className="dispositions__choix"
              aria-pressed={composition === l.id}
              onClick={() => setLayout(l.id)}
            >
              {l.nom}
            </button>
          ))}
        </div>

        <PrintCarousel
          motif={motif}
          onStep={(pas) => setMotif((prev) => stepPrintMotif(prev, pas))}
        />

        <PrintColorSlider
          palette={theme.palette}
          teinte={teinte}
          defaut={teinteDefaut}
          onChange={setTeinte}
        />

        <PrintSlider
          id="taille-motif"
          label="Taille du décor"
          valeur={echelle}
          min={0.4}
          max={2.2}
          pas={0.05}
          defaut={MOTIF_ECHELLE_DEFAUT}
          format={(v) => `×${v.toFixed(2).replace(".", ",")}`}
          onChange={setEchelle}
        />

        <PrintSlider
          id="contraste-motif"
          label="Contraste du décor"
          valeur={opacite}
          min={0.02}
          max={0.4}
          pas={0.01}
          defaut={MOTIF_OPACITE_DEFAUT}
          format={(v) => `${Math.round(v * 100)} %`}
          onChange={setOpacite}
        />
      </div>

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

        </div>
      </div>
    </div>
  );
}
