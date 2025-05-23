import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import './SyllabusUpload.css';

const SyllabusUpload = ({ subjectId }) => {
    const [files, setFiles] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState({});
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        checkAuth();
        fetchUploadedFiles();
    }, [subjectId]);

    const checkAuth = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            console.log('Estado de la sesión:', session);
            if (error) {
                console.error('Error al verificar sesión:', error);
                throw error;
            }
            setIsAuthenticated(!!session);
        } catch (error) {
            console.error('Error checking auth:', error);
            setIsAuthenticated(false);
        }
    };

    const fetchUploadedFiles = async () => {
        try {
            console.log('Intentando obtener archivos para subjectId:', subjectId);
            const { data, error } = await supabase
                .from('syllabi')
                .select('*')
                .eq('subject_id', subjectId);

            if (error) {
                console.error('Error al obtener archivos:', error);
                throw error;
            }
            console.log('Archivos obtenidos:', data);
            setUploadedFiles(data || []);
        } catch (error) {
            console.error('Error fetching files:', error);
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
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            ];
            return validTypes.includes(file.type);
        });

        if (validFiles.length !== selectedFiles.length) {
            setError('Algunos archivos no son válidos. Solo se permiten PDF, Word y PowerPoint.');
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
                const filePath = `syllabi/${fileName}`;

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
                    .from('syllabi')
                    .insert([
                        {
                            subject_id: subjectId,
                            file_name: file.name,
                            file_url: publicUrl,
                            file_type: file.type,
                            file_size: file.size
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
            console.error('Error uploading files:', error);
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
                .from('syllabi')
                .delete()
                .eq('id', fileId);

            if (error) throw error;

            await fetchUploadedFiles();
        } catch (error) {
            console.error('Error deleting file:', error);
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

    if (!isAuthenticated) {
        return (
            <div className="syllabus-upload-container">
                <div className="error-message">
                    Debes iniciar sesión para subir y gestionar archivos.
                </div>
            </div>
        );
    }

    return (
        <div className="syllabus-upload-container">
            <div className="upload-section">
                <input
                    type="file"
                    className="file-input"
                    onChange={handleFileChange}
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                />
                <button
                    className="upload-button"
                    onClick={handleUpload}
                    disabled={uploading || files.length === 0}
                >
                    {uploading ? 'Subiendo...' : 'Subir Archivos'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {files.length > 0 && (
                <div className="files-queue">
                    <h4>Archivos en cola</h4>
                    <div className="files-list">
                        {files.map((file, index) => (
                            <div key={index} className="file-item">
                                <div className="file-details">
                                    <span className="file-name">{file.name}</span>
                                    <span className="file-type">{file.type}</span>
                                    <span className="file-size">{formatFileSize(file.size)}</span>
                                    {progress[file.name] !== undefined && (
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${progress[file.name]}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="file-actions">
                                    <button
                                        className="remove-button"
                                        onClick={() => removeFile(index)}
                                        disabled={uploading}
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {uploadedFiles.length > 0 && (
                <div className="uploaded-files">
                    <h4>Archivos subidos</h4>
                    <div className="files-list">
                        {uploadedFiles.map((file) => (
                            <div key={file.id} className="file-item">
                                <div className="file-details">
                                    <span className="file-name">{file.file_name}</span>
                                    <span className="file-type">{file.file_type}</span>
                                    <span className="file-size">{formatFileSize(file.file_size)}</span>
                                </div>
                                <div className="file-actions">
                                    <a
                                        href={file.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="view-button"
                                    >
                                        Ver
                                    </a>
                                    <button
                                        className="delete-button"
                                        onClick={() => handleDelete(file.id)}
                                        disabled={uploading}
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SyllabusUpload; 