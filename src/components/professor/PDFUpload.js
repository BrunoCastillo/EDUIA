import React, { useState } from 'react';
import { supabase } from '../../config/supabaseClient';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PDFUpload.css';

// Configurar el worker de PDF.js

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

const PDFUpload = ({ subjectId, session: sessionProp }) => {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            setUploadedFileUrl(URL.createObjectURL(selectedFile));
            setError(null);
        } else {
            setError('Por favor, selecciona un archivo PDF válido');
            setFile(null);
            setUploadedFileUrl(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !title) {
            setError('Por favor, selecciona un archivo y proporciona un título');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Primero subir el archivo
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch('http://localhost:3001/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(`Error al subir el archivo: ${errorData.error || uploadResponse.statusText}`);
            }

            const { fileUrl, filePath } = await uploadResponse.json();

            // Luego guardar la información en la base de datos
            const fileData = {
                title,
                subject_id: subjectId,
                user_id: sessionProp.user.id,
                file_path: filePath,
                file_url: fileUrl,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size
            };

            console.log('Enviando datos al servidor:', fileData);

            const dbResponse = await fetch('http://localhost:3001/api/files', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(fileData)
            });

            if (!dbResponse.ok) {
                const errorData = await dbResponse.json();
                console.error('Error del servidor:', errorData);
                throw new Error(`Error al guardar la información del archivo: ${errorData.error || errorData.details || dbResponse.statusText}`);
            }

            const responseData = await dbResponse.json();
            console.log('Respuesta del servidor:', responseData);

            // Limpiar el formulario
            setFile(null);
            setTitle('');
            setUploadedFileUrl(null);
            setError(null);
            alert('Archivo subido exitosamente');
        } catch (err) {
            console.error('Error completo:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setPageNumber(1);
    };

    return (
        <div className="pdf-upload-container">
            <h2>Subir PDF</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="title">Título:</label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="file">Seleccionar PDF:</label>
                    <input
                        type="file"
                        id="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        required
                    />
                </div>
                {error && <div className="error">{error}</div>}
                <button type="submit" disabled={loading}>
                    {loading ? 'Subiendo...' : 'Subir PDF'}
                </button>
            </form>

            {uploadedFileUrl && (
                <div className="pdf-viewer">
                    <h4>Vista Previa del PDF</h4>
                    <Document
                        file={uploadedFileUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={<div>Cargando PDF...</div>}
                        error={<div>Error al cargar el PDF</div>}
                    >
                        <Page pageNumber={pageNumber} scale={1.2} />
                    </Document>
                    <div>
                        Página {pageNumber} de {numPages}
                        <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>Anterior</button>
                        <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}>Siguiente</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PDFUpload; 