import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './FileUpload.css';

// Configurar el worker de PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const FileUpload = ({ subjectId, session: sessionProp }) => {
    const navigate = useNavigate();
    const [files, setFiles] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState({});
    const [selectedFolder, setSelectedFolder] = useState('documents');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [session, setSession] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [showPdfViewer, setShowPdfViewer] = useState(false);

    useEffect(() => {
        checkAuth();
    }, [sessionProp]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchUploadedFiles();
        }
    }, [selectedFolder, subjectId, isAuthenticated]);

    const checkAuth = async () => {
        try {
            setIsLoading(true);
            let currentSession = sessionProp;
            if (!currentSession) {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('Error al verificar sesión:', error);
                    throw error;
                }
                currentSession = session;
            }
            console.log('[FileUpload] Sesión recibida:', currentSession);
            setSession(currentSession);
            if (!currentSession) {
                console.log('[FileUpload] No hay sesión activa, redirigiendo a login...');
                navigate('/login');
                return;
            }
            setIsAuthenticated(true);
        } catch (error) {
            console.error('[FileUpload] Error checking auth:', error);
            setIsAuthenticated(false);
            navigate('/login');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUploadedFiles = async () => {
        try {
            console.log('Intentando obtener archivos para subjectId:', subjectId);
            const { data, error } = await supabase
                .from('files')
                .select('*')
                .eq('folder', selectedFolder)
                .eq('subject_id', subjectId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error al obtener archivos:', error);
                throw error;
            }
            console.log('Archivos obtenidos:', data);
            setUploadedFiles(data || []);
        } catch (error) {
            console.error('Error al cargar archivos:', error);
            setError('Error al cargar los archivos');
        }
    };

    const handleFileChange = (event) => {
        if (!isAuthenticated) {
            setError('Debes iniciar sesión para subir archivos');
            return;
        }

        const selectedFiles = Array.from(event.target.files);
        const validFiles = selectedFiles.filter(file => {
            const validTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'image/jpeg',
                'image/png',
                'image/gif'
            ];
            return validTypes.includes(file.type);
        });

        if (validFiles.length !== selectedFiles.length) {
            setError('Algunos archivos no son válidos. Solo se permiten PDF, Word, PowerPoint e imágenes.');
        }

        setFiles(prevFiles => [...prevFiles, ...validFiles]);
        setError(null);
    };

    const removeFile = (index) => {
        setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (!isAuthenticated) {
            setError('Debes iniciar sesión para subir archivos');
            return;
        }

        if (files.length === 0) {
            setError('Por favor, selecciona al menos un archivo');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            // Verificar la sesión antes de subir
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;
            if (!session) throw new Error('No hay sesión activa');

            // Subir cada archivo
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const filePath = `${selectedFolder}/${fileName}`;

                setProgress(prev => ({ ...prev, [fileName]: 0 }));

                // Subir archivo al storage
                const { error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Error al subir archivo:', uploadError);
                    throw new Error('Error al subir el archivo al almacenamiento');
                }

                // Obtener URL pública
                const { data: { publicUrl } } = supabase.storage
                    .from('documents')
                    .getPublicUrl(filePath);

                // Guardar en la base de datos
                const { error: dbError } = await supabase
                    .from('files')
                    .insert([
                        {
                            subject_id: subjectId,
                            name: file.name,
                            path: filePath,
                            type: file.type,
                            size: file.size,
                            folder: selectedFolder
                        }
                    ]);

                if (dbError) {
                    console.error('Error al guardar en la base de datos:', dbError);
                    throw new Error('Error al guardar la información del archivo');
                }

                setProgress(prev => ({ ...prev, [fileName]: 100 }));
            }

            await fetchUploadedFiles();
            setFiles([]);
            setProgress({});
        } catch (error) {
            console.error('Error al subir archivos:', error);
            setError(error.message || 'Error al subir los archivos');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (fileId) => {
        if (!isAuthenticated) {
            setError('Debes iniciar sesión para eliminar archivos');
            return;
        }

        try {
            const { error } = await supabase
                .from('files')
                .delete()
                .eq('id', fileId);

            if (error) throw error;

            await fetchUploadedFiles();
        } catch (error) {
            console.error('Error al eliminar archivo:', error);
            setError('Error al eliminar el archivo');
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleViewFile = async (file) => {
        try {
            // Obtener la URL pública del archivo
            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(file.path);

            setSelectedFile(publicUrl);
            setShowPdfViewer(true);
        } catch (error) {
            console.error('Error al cargar el archivo:', error);
            setError('Error al cargar el archivo para visualización');
        }
    };

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setPageNumber(1);
    };

    const changePage = (offset) => {
        setPageNumber(prevPageNumber => prevPageNumber + offset);
    };

    const previousPage = () => changePage(-1);
    const nextPage = () => changePage(1);

    if (isLoading) {
        return (
            <div className="file-upload-container">
                <div className="loading-message">
                    Verificando autenticación...
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="file-upload-container">
                <div className="error-message">
                    Debes iniciar sesión para subir y gestionar archivos.
                    <button 
                        onClick={() => navigate('/login')}
                        className="login-button"
                    >
                        Ir a inicio de sesión
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="file-upload-container">
            <div className="folder-selector">
                <label htmlFor="folder">Seleccionar carpeta:</label>
                <select
                    id="folder"
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                >
                    <option value="documents">Documentos</option>
                    <option value="assignments">Tareas</option>
                    <option value="resources">Recursos</option>
                </select>
            </div>

            <div className="upload-section">
                <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                />
                <button 
                    onClick={handleUpload}
                    disabled={uploading || files.length === 0}
                    className="upload-button"
                >
                    {uploading ? 'Subiendo...' : 'Subir archivos'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="files-list">
                <h3>Archivos subidos:</h3>
                {uploadedFiles.length === 0 ? (
                    <p>No hay archivos subidos</p>
                ) : (
                    <div className="files-grid">
                        {uploadedFiles.map((file) => (
                            <div key={file.id} className="file-card">
                                <div className="file-info">
                                    <h4>{file.name}</h4>
                                    <p>Tamaño: {formatFileSize(file.size)}</p>
                                    <p>Fecha: {new Date(file.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="file-actions">
                                    <button 
                                        onClick={() => handleViewFile(file)}
                                        className="view-button"
                                    >
                                        Ver
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(file.id)}
                                        className="delete-button"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showPdfViewer && selectedFile && (
                <div className="pdf-viewer-modal">
                    <div className="pdf-viewer-content">
                        <div className="pdf-controls">
                            <button onClick={previousPage} disabled={pageNumber <= 1}>
                                Anterior
                            </button>
                            <span>
                                Página {pageNumber} de {numPages}
                            </span>
                            <button onClick={nextPage} disabled={pageNumber >= numPages}>
                                Siguiente
                            </button>
                            <button 
                                onClick={() => setShowPdfViewer(false)}
                                className="close-button"
                            >
                                Cerrar
                            </button>
                        </div>
                        <Document
                            file={selectedFile}
                            onLoadSuccess={onDocumentLoadSuccess}
                            className="pdf-document"
                        >
                            <Page 
                                pageNumber={pageNumber} 
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                            />
                        </Document>
                    </div>
                </div>
            )}

            {files.length > 0 && (
                <div className="selected-files">
                    <h3>Archivos seleccionados:</h3>
                    <div className="files-grid">
                        {files.map((file, index) => (
                            <div key={index} className="file-card">
                                <div className="file-info">
                                    <h4>{file.name}</h4>
                                    <p>Tamaño: {formatFileSize(file.size)}</p>
                                </div>
                                <button 
                                    onClick={() => removeFile(index)}
                                    className="remove-button"
                                >
                                    Eliminar
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUpload; 