# endpoints.py
# Funciones reutilizables para depurar Data Models (WEB SAFE)

import re
import xml.etree.ElementTree as ET

XML_LANG_KEY = '{http://www.w3.org/XML/1998/namespace}lang'


def _strip_comments_and_clean_lines(xml_str: str) -> str:
    if not xml_str or not xml_str.strip():
        raise ValueError("El XML está vacío")

    no_comments = re.sub(r'<!--.*?-->', '', xml_str, flags=re.DOTALL)
    no_declaration = re.sub(r'^\s*<\?xml.*?\?\>\s*', '', no_comments, flags=re.DOTALL)
    lines = no_declaration.splitlines()
    clean_lines = [ln for ln in lines if ln.strip()]
    return '\n'.join(clean_lines)


def _remove_children_not_in_lang(elem, idiomas_objetivo):
    if not idiomas_objetivo:
        return

    for child in list(elem):
        _remove_children_not_in_lang(child, idiomas_objetivo)
        lang = child.attrib.get(XML_LANG_KEY)
        if lang is not None and lang not in idiomas_objetivo:
            elem.remove(child)


def _norm_list(x):
    if x is None:
        return []
    if isinstance(x, str):
        return [x.strip()] if x.strip() else []
    if isinstance(x, (list, tuple, set)):
        return [i for i in x if isinstance(i, str) and i.strip()]
    return []


# =========================
# CDM
# =========================

def procesar_cdm(xml_str, idiomas_objetivo=None):
    xml_clean = _strip_comments_and_clean_lines(xml_str)

    inicio = xml_clean.find("<corporate-data-model")
    if inicio == -1:
        raise ValueError("El XML no corresponde a un Corporate Data Model")

    contenido_antes = xml_clean[:inicio]
    contenido_relevante = xml_clean[inicio:]

    try:
        root = ET.fromstring(f"<root>{contenido_relevante}</root>")
    except ET.ParseError as e:
        raise ValueError(f"Error al parsear CDM: {e}")

    for elem in root.iter():
        _remove_children_not_in_lang(elem, idiomas_objetivo)

    contenido_limpio = ''.join(
        ET.tostring(e, encoding='unicode') for e in root
    )

    return (contenido_antes + "\n" + contenido_limpio).strip()


# =========================
# SDM
# =========================

def procesar_sdm(xml_str, idiomas_objetivo=None):
    xml_clean = _strip_comments_and_clean_lines(xml_str)

    inicio = xml_clean.find("<succession-data-model")
    if inicio == -1:
        raise ValueError("El XML no corresponde a un Succession Data Model")

    contenido_antes = xml_clean[:inicio]
    contenido_relevante = xml_clean[inicio:]

    try:
        root = ET.fromstring(f"<root>{contenido_relevante}</root>")
    except ET.ParseError as e:
        raise ValueError(f"Error al parsear SDM: {e}")

    for elem in root.iter():
        _remove_children_not_in_lang(elem, idiomas_objetivo)

    contenido_limpio = ''.join(
        ET.tostring(e, encoding='unicode') for e in root
    )

    return (contenido_antes + "\n" + contenido_limpio).strip()


# =========================
# CSF
# =========================

def detectar_tipo_csf(xml_clean: str) -> str:
    # Extraer solo el contenido de country-specific-fields
    inicio = xml_clean.find("<country-specific-fields")
    fin = xml_clean.find("</country-specific-fields>")

    if inicio == -1 or fin == -1:
        raise ValueError("CSF inválido: falta country-specific-fields")

    contenido_csf = xml_clean[inicio:fin + len("</country-specific-fields>")]

    try:
        root = ET.fromstring(f"<root>{contenido_csf}</root>")
    except ET.ParseError as e:
        raise ValueError(f"CSF inválido: error de parseo - {e}")

    csf = root.find('country-specific-fields')
    if csf is None:
        raise ValueError("CSF inválido: estructura incorrecta")

    if csf.find('.//format-group') is not None:
        return 'csf_sdm'

    if csf.find('.//hris-element') is not None:
        return 'csf_cdm'

    raise ValueError("CSF inválido: no se pudo determinar el tipo")

def procesar_csf(xml_str, paises_objetivo=None, idiomas_objetivo=None, tipo_esperado=None):
    xml_clean = _strip_comments_and_clean_lines(xml_str)

    tipo_detectado = detectar_tipo_csf(xml_clean)

    if tipo_esperado and tipo_detectado != tipo_esperado:
        raise ValueError(
            f"CSF incorrecto. Se esperaba {tipo_esperado}, pero se detectó {tipo_detectado}"
        )

    inicio = xml_clean.find("<country-specific-fields")
    fin = xml_clean.find("</country-specific-fields>")

    if inicio == -1 or fin == -1:
        raise ValueError("El XML no corresponde a un Country Specific Fields válido")

    contenido_antes = xml_clean[:inicio]
    contenido_csf = xml_clean[inicio:fin + len("</country-specific-fields>")]

    try:
        root = ET.fromstring(f"<root>{contenido_csf}</root>")
    except ET.ParseError as e:
        raise ValueError(f"Error al parsear CSF: {e}")

    csf = root.find('country-specific-fields')
    if csf is None:
        raise ValueError("Estructura CSF inválida")

    paises = _norm_list(paises_objetivo)

    for country in list(csf.findall('country')):
        country_id = country.attrib.get('id')

        if paises and country_id not in paises:
            csf.remove(country)
            continue

        for elem in country.iter():
            _remove_children_not_in_lang(elem, idiomas_objetivo)

    contenido_limpio = ''.join(
        ET.tostring(e, encoding='unicode') for e in root
    )

    return (contenido_antes + "\n" + contenido_limpio).strip()


# ===============================
# COMPLETE DATA MODEL PROCESSING
# ===============================

def procesar_data_model_completo(
        cdm_xml,
        csf_cdm_xml,
        sdm_xml,
        csf_sdm_xml,
        *,
        paises=None,
        idiomas=None
):
    """
    Procesa los 4 Data Models usando selección global de países / idiomas.
    Devuelve un dict con los XML depurados.
    """

    idiomas_norm = _norm_list(idiomas)
    paises_norm = _norm_list(paises)

    resultados = {}

    if cdm_xml:
        resultados["cdm"] = procesar_cdm(cdm_xml, idiomas_norm)
    else:
        resultados["cdm"] = ""

    if csf_cdm_xml:
        resultados["csf_cdm"] = procesar_csf(
            csf_cdm_xml,
            paises_norm,
            idiomas_norm,
            tipo_esperado='csf_cdm'
        )
    else:
        resultados["csf_cdm"] = ""

    if sdm_xml:
        resultados["sdm"] = procesar_sdm(sdm_xml, idiomas_norm)
    else:
        resultados["sdm"] = ""

    if csf_sdm_xml:
        resultados["csf_sdm"] = procesar_csf(
            csf_sdm_xml,
            paises_norm,
            idiomas_norm,
            tipo_esperado='csf_sdm'
        )
    else:
        resultados["csf_sdm"] = ""

    return resultados