import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import './FileUpload.css';

const FileUpload = ({ subjectId }) => {
    const [files, setFiles] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState({});
    const [selectedFolder, setSelectedFolder] = useState('documents');

    useEffect(() => {
        fetchUploadedFiles();
    }, [selectedFolder, subjectId]);

    const fetchUploadedFiles = async () => {
        try {
            const { data, error } = await supabase
                .from('files')
                .select('*')
                .eq('folder', selectedFolder)
                .eq('subject_id', subjectId);

            if (error) throw error;
            setUploadedFiles(data || []);
        } catch (error) {
            console.error('Error al cargar archivos:', error);
            setError('Error al cargar los archivos');
        }
    };

    const handleFileChange = (event) => {
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
        if (files.length === 0) {
            setError('Por favor, selecciona al menos un archivo');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            // Verificar si existe el bucket
            const { data: buckets } = await supabase.storage.listBuckets();
            const documentsBucket = buckets.find(b => b.name === 'documents');

            if (!documentsBucket) {
                try {
                    await supabase.storage.createBucket('documents', {
                        public: true
                    });
                } catch (error) {
                    if (error.message.includes('policy')) {
                        setError('No tienes permisos para crear el almacenamiento. Por favor, contacta al administrador.');
                        return;
                    }
                    throw error;
                }
            }

            // Subir cada archivo
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const filePath = `${selectedFolder}/${fileName}`;

                // Actualizar progreso
                setProgress(prev => ({
                    ...prev,
                    [fileName]: 0
                }));

                // Subir archivo
                const { error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                // Insertar en la base de datos
                const { error: dbError } = await supabase
                    .from('files')
                    .insert([
                        {
                            name: file.name,
                            path: filePath,
                            type: file.type,
                            size: file.size,
                            folder: selectedFolder,
                            subject_id: subjectId
                        }
                    ]);

                if (dbError) throw dbError;

                // Actualizar progreso
                setProgress(prev => ({
                    ...prev,
                    [fileName]: 100
                }));
            }

            // Limpiar archivos y actualizar lista
            setFiles([]);
            fetchUploadedFiles();
        } catch (error) {
            console.error('Error al subir archivos:', error);
            setError('Error al subir los archivos. Por favor, intenta de nuevo.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (fileId, filePath) => {
        try {
            // Eliminar de storage
            const { error: storageError } = await supabase.storage
                .from('documents')
                .remove([filePath]);

            if (storageError) throw storageError;

            // Eliminar de la base de datos
            const { error: dbError } = await supabase
                .from('files')
                .delete()
                .eq('id', fileId);

            if (dbError) throw dbError;

            // Actualizar lista
            fetchUploadedFiles();
        } catch (error) {
            console.error('Error al eliminar archivo:', error);
            setError('Error al eliminar el archivo. Por favor, intenta de nuevo.');
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

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
                    <option value="syllabi">Programas</option>
                    <option value="resources">Recursos</option>
                </select>
            </div>

            <div className="upload-section">
                <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="file-input"
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

            {files.length > 0 && (
                <div className="files-queue">
                    <h4>Archivos a subir:</h4>
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
                                        onClick={() => removeFile(index)}
                                        className="remove-button"
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
                    <h4>Archivos subidos:</h4>
                    <div className="files-list">
                        {uploadedFiles.map((file) => (
                            <div key={file.id} className="file-item">
                                <div className="file-details">
                                    <span className="file-name">{file.name}</span>
                                    <span className="file-type">{file.type}</span>
                                    <span className="file-size">{formatFileSize(file.size)}</span>
                                </div>
                                <div className="file-actions">
                                    <a
                                        href={`${supabase.storage.from('documents').getPublicUrl(file.path).data.publicUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="view-button"
                                    >
                                        Ver
                                    </a>
                                    <button
                                        onClick={() => handleDelete(file.id, file.path)}
                                        className="delete-button"
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

export default FileUpload; 