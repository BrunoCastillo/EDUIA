import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config';
import { deepseekService } from '../../services/deepseek.service';
import { Subjects } from './Subjects';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('subjects');
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }

            // Usar la información del usuario directamente de auth.users
            setUser({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email.split('@')[0]
            });
        } catch (error) {
            console.error('Error al verificar usuario:', error);
            navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            navigate('/login');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!chatMessage.trim() || isProcessing) return;

        const userMessage = chatMessage.trim();
        setChatMessage('');
        setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsProcessing(true);

        try {
            const response = await deepseekService.sendMessage(userMessage);
            setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            setChatHistory(prev => [...prev, { 
                role: 'assistant', 
                content: 'Lo siento, ha ocurrido un error al procesar tu mensaje.' 
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return <div className="loading">Cargando...</div>;
    }

    if (!user) {
        return null;
    }

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="user-info">
                    <h1>Bienvenido, {user.full_name}</h1>
                    <p>{user.email}</p>
                </div>
                <button className="logout-button" onClick={handleLogout}>
                    Cerrar Sesión
                </button>
            </header>

            <div className="dashboard-content">
                <nav className="dashboard-nav">
                    <button 
                        className={`nav-button ${activeTab === 'subjects' ? 'active' : ''}`}
                        onClick={() => setActiveTab('subjects')}
                    >
                        Mis Asignaturas
                    </button>
                    <button 
                        className={`nav-button ${activeTab === 'chat' ? 'active' : ''}`}
                        onClick={() => setActiveTab('chat')}
                    >
                        Chat con IA
                    </button>
                </nav>

                <main className="dashboard-main">
                    {activeTab === 'subjects' ? (
                        <Subjects professorId={user.id} />
                    ) : (
                        <div className="chat-container">
                            <div className="chat-messages">
                                {chatHistory.length === 0 ? (
                                    <div className="welcome-message">
                                        <h2>Bienvenido al Asistente IA</h2>
                                        <p>Puedo ayudarte con:</p>
                                        <ul>
                                            <li>Diseño de planes de estudio</li>
                                            <li>Creación de materiales didácticos</li>
                                            <li>Evaluación de estudiantes</li>
                                            <li>Resolución de dudas pedagógicas</li>
                                        </ul>
                                    </div>
                                ) : (
                                    chatHistory.map((message, index) => (
                                        <div 
                                            key={index} 
                                            className={`message ${message.role}`}
                                        >
                                            {message.content}
                                        </div>
                                    ))
                                )}
                            </div>
                            <form onSubmit={handleSendMessage} className="chat-input">
                                <input
                                    type="text"
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    placeholder="Escribe tu mensaje..."
                                    disabled={isProcessing}
                                />
                                <button 
                                    type="submit" 
                                    disabled={isProcessing || !chatMessage.trim()}
                                >
                                    {isProcessing ? 'Enviando...' : 'Enviar'}
                                </button>
                            </form>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Dashboard; 