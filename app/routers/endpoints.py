# app/routers/endpoints.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.models.schemas import (
    ProcesamientoRequest,
    ProcesamientoCompletoRequest,
    ProcesamientoResponse,
    PaisesIdiomasResponse
)
from app.services import processing as proc
from app.services.data import PAISES_DISPONIBLES, IDIOMAS_DISPONIBLES
import tempfile
import zipfile
import os

router = APIRouter()


@router.get("/countries", response_model=PaisesIdiomasResponse)
async def obtener_paises():
    paises_ordenados = dict(
        sorted(
            PAISES_DISPONIBLES.items(),
            key=lambda item: item[0].lower()
        )
    )
    return {"data": paises_ordenados}


@router.get("/languages", response_model=PaisesIdiomasResponse)
async def obtener_idiomas():
    idiomas_ordenados = dict(
        sorted(
            IDIOMAS_DISPONIBLES.items(),
            key=lambda item: item[0].lower()
        )
    )
    return {"data": idiomas_ordenados}


@router.post("/process/cdm", response_model=ProcesamientoResponse)
async def procesar_cdm(request: ProcesamientoRequest):
    """Procesa Corporate Data Model"""
    try:
        resultado = proc.procesar_cdm(
            request.xml_content,
            request.idiomas
        )
        return {
            "success": True,
            "resultado": resultado,
            "message": "CDM procesado exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/process/sdm", response_model=ProcesamientoResponse)
async def procesar_sdm(request: ProcesamientoRequest):
    """Procesa Succession Data Model"""
    try:
        resultado = proc.procesar_sdm(
            request.xml_content,
            request.idiomas
        )
        return {
            "success": True,
            "resultado": resultado,
            "message": "SDM procesado exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/process/csf", response_model=ProcesamientoResponse)
async def procesar_csf(request: ProcesamientoRequest):
    """Procesa Country Specific Fields"""
    try:
        if not request.paises:
            raise HTTPException(
                status_code=400,
                detail="Se requiere al menos un país para CSF"
            )

        resultado = proc.procesar_csf(
            request.xml_content,
            request.paises,
            request.idiomas
        )
        return {
            "success": True,
            "resultado": resultado,
            "message": "CSF procesado exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/process/full")
async def procesar_completo(request: ProcesamientoCompletoRequest):
    """Procesa los 4 Data Models y genera un ZIP"""
    try:
        # Procesar los 4 modelos
        resultados = proc.procesar_data_model_completo(
            cdm_xml=request.cdm_xml,
            csf_cdm_xml=request.csf_cdm_xml,
            sdm_xml=request.sdm_xml,
            csf_sdm_xml=request.csf_sdm_xml,
            paises=request.paises,
            idiomas=request.idiomas
        )

        # Crear ZIP temporal
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp_file:
            zip_path = tmp_file.name

        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for nombre, contenido in resultados.items():
                if contenido:
                    zipf.writestr(f"{nombre}_depurado.xml", contenido)

        # Devolver el archivo ZIP
        return FileResponse(
            zip_path,
            media_type='application/zip',
            filename='data_models_depurados.zip',
            background=lambda: os.unlink(zip_path)  # Eliminar después de enviar
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
