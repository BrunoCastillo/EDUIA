import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import './SyllabusUpload.css';

const SyllabusUpload = ({ subjectId }) => {
    const [files, setFiles] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState({});

    useEffect(() => {
        fetchUploadedFiles();
    }, [subjectId]);

    const fetchUploadedFiles = async () => {
        try {
            const { data, error } = await supabase
                .from('syllabi')
                .select('*')
                .eq('subject_id', subjectId);

            if (error) throw error;
            setUploadedFiles(data || []);
        } catch (error) {
            console.error('Error fetching files:', error);
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
                    } else {
                        throw error;
                    }
                    return;
                }
            }

            // Verificar si existe la carpeta syllabi
            const { data: folders } = await supabase.storage
                .from('documents')
                .list('syllabi');

            if (!folders || folders.length === 0) {
                // Crear un archivo temporal para forzar la creación de la carpeta
                await supabase.storage
                    .from('documents')
                    .upload('syllabi/.placeholder', new Blob(['']));
            }

            // Subir cada archivo
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const filePath = `syllabi/${fileName}`;

                setProgress(prev => ({ ...prev, [fileName]: 0 }));

                const { error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('documents')
                    .getPublicUrl(filePath);

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

                if (dbError) throw dbError;

                setProgress(prev => ({ ...prev, [fileName]: 100 }));
            }

            await fetchUploadedFiles();
            setFiles([]);
            setProgress({});
        } catch (error) {
            console.error('Error uploading files:', error);
            setError('Error al subir los archivos');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (fileId) => {
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