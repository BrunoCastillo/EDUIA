import React, { useState } from 'react';
import './SubjectForm.css';

const SubjectForm = ({ onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: ''
    });
    const [error, setError] = useState(null);

    const generateCode = (name) => {
        // Tomar las primeras 3 letras de cada palabra y convertirlas a mayúsculas
        const words = name.split(' ');
        const code = words
            .map(word => word.substring(0, 3).toUpperCase())
            .join('');
        return code;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.name.trim()) {
            setError('Por favor, ingrese el nombre de la asignatura');
            return;
        }

        try {
            // Generar el código automáticamente
            const code = generateCode(formData.name);
            await onSubmit({
                ...formData,
                code
            });
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="subject-form-container">
            <form onSubmit={handleSubmit} className="subject-form">
                <div className="form-group">
                    <label htmlFor="name">Nombre de la Asignatura</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Ej: Matemáticas Avanzadas"
                        required
                    />
                    <small className="form-text">
                        El código se generará automáticamente basado en el nombre
                    </small>
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="form-actions">
                    <button type="button" className="cancel-button" onClick={onCancel}>
                        Cancelar
                    </button>
                    <button type="submit" className="submit-button">
                        Crear Asignatura
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SubjectForm; 