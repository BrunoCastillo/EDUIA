import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import SubjectList from './SubjectList';
import SubjectForm from './SubjectForm';
import FileUpload from './FileUpload';
import './ProfessorDashboard.css';

const ProfessorDashboard = () => {
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No hay usuario autenticado');

            const { data, error } = await supabase
                .from('subjects')
                .select('*')
                .eq('professor_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSubjects(data || []);
        } catch (error) {
            console.error('Error al cargar materias:', error);
            setError('Error al cargar las materias');
        } finally {
            setLoading(false);
        }
    };

    const handleSubjectSelect = (subject) => {
        setSelectedSubject(subject);
        setShowForm(false);
    };

    const handleAddSubject = () => {
        setSelectedSubject(null);
        setShowForm(true);
    };

    const handleSubjectCreated = () => {
        fetchSubjects();
        setShowForm(false);
    };

    if (loading) {
        return <div className="loading">Cargando...</div>;
    }

    return (
        <div className="professor-dashboard">
            <div className="dashboard-header">
                <h2>Panel del Profesor</h2>
                <button onClick={handleAddSubject} className="add-subject-button">
                    Agregar Materia
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="dashboard-content">
                <div className="subjects-section">
                    <SubjectList
                        subjects={subjects}
                        onSubjectSelect={handleSubjectSelect}
                        selectedSubject={selectedSubject}
                    />
                </div>

                <div className="subject-details">
                    {showForm ? (
                        <SubjectForm
                            onSubjectCreated={handleSubjectCreated}
                            onCancel={() => setShowForm(false)}
                        />
                    ) : selectedSubject ? (
                        <div className="subject-info">
                            <h3>{selectedSubject.name}</h3>
                            <p><strong>Código:</strong> {selectedSubject.code}</p>
                            <p><strong>Créditos:</strong> {selectedSubject.credits}</p>
                            <p><strong>Descripción:</strong> {selectedSubject.description}</p>
                            
                            <div className="documents-section">
                                <h4>Documentos de la Materia</h4>
                                <FileUpload subjectId={selectedSubject.id} />
                            </div>
                        </div>
                    ) : (
                        <div className="no-subject-selected">
                            <p>Selecciona una materia para ver sus detalles y documentos</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfessorDashboard; 