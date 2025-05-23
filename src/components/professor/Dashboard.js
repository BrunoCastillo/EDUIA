import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config';
import { deepseekService } from '../../services/deepseek.service';
import { Subjects } from './Subjects';
import PDFUpload from './PDFUpload';
import FileUpload from './FileUpload';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('subjects');
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [session, setSession] = useState(null);

    useEffect(() => {
        checkUser();
    }, []);

    useEffect(() => {
        if (user && activeTab === 'files') {
            fetchSubjects();
            checkSession();
        }
    }, [user, activeTab]);

    const checkUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            console.log('[Dashboard] Usuario obtenido:', user);
            if (!user) {
                console.warn('[Dashboard] No hay usuario autenticado, redirigiendo a login');
                navigate('/login');
                return;
            }
            setUser({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email.split('@')[0]
            });
        } catch (error) {
            console.error('[Dashboard] Error al verificar usuario:', error);
            navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const checkSession = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.error('[Dashboard] Error al obtener sesión:', error);
            }
            console.log('[Dashboard] Estado de la sesión:', session);
            setSession(session);
        } catch (error) {
            console.error('[Dashboard] Error al verificar sesión:', error);
            setSession(null);
        }
    };

    const fetchSubjects = async () => {
        try {
            const { data, error } = await supabase
                .from('subjects')
                .select('id, name')
                .eq('professor_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setSubjects(data || []);
            if (data && data.length > 0 && !selectedSubjectId) {
                setSelectedSubjectId(data[0].id);
            }
        } catch (error) {
            console.error('[Dashboard] Error al cargar materias:', error);
        }
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            navigate('/login');
        } catch (error) {
            console.error('[Dashboard] Error al cerrar sesión:', error);
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
            console.error('[Dashboard] Error al enviar mensaje:', error);
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
                    <div className="nav-header">
                        <h2>EDUIA</h2>
                        <p>Panel del Profesor</p>
                    </div>
                    <ul className="nav-menu">
                        <li>
                            <button 
                                className={activeTab === 'subjects' ? 'active' : ''}
                                onClick={() => setActiveTab('subjects')}
                            >
                                Mis Asignaturas
                            </button>
                        </li>
                        <li>
                            <button 
                                className={activeTab === 'chat' ? 'active' : ''}
                                onClick={() => setActiveTab('chat')}
                            >
                                Chat con IA
                            </button>
                        </li>
                        <li>
                            <button 
                                className={activeTab === 'files' ? 'active' : ''}
                                onClick={() => setActiveTab('files')}
                            >
                                Carga de Archivos
                            </button>
                        </li>
                    </ul>
                    <button className="logout-button" onClick={handleLogout}>
                        Cerrar Sesión
                    </button>
                </nav>

                <main className="dashboard-main">
                    {activeTab === 'subjects' && (
                        <Subjects professorId={user.id} />
                    )}
                    {activeTab === 'chat' && (
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
                    {activeTab === 'files' && (
                        <div className="files-section">
                            <h2>Carga de Archivos</h2>
                            <pre style={{background:'#f8f9fa',padding:'10px',borderRadius:'6px',fontSize:'0.95em',color:'#333'}}>
                                Estado de sesión: {session ? 'ACTIVA' : 'NO ACTIVA'}
                                {session && session.user ? ` | Usuario: ${session.user.email}` : ''}
                            </pre>
                            {(!session || !session.user) ? (
                                <div className="no-subjects">
                                    <p>No hay sesión activa. Por favor, vuelve a iniciar sesión.</p>
                                </div>
                            ) : subjects.length === 0 ? (
                                <div className="no-subjects">
                                    <p>No tienes asignaturas registradas. Crea una para poder cargar archivos.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="select-subject-section">
                                        <label htmlFor="select-subject">Selecciona una asignatura:</label>
                                        <select
                                            id="select-subject"
                                            value={selectedSubjectId}
                                            onChange={e => setSelectedSubjectId(e.target.value)}
                                        >
                                            {subjects.map(subject => (
                                                <option key={subject.id} value={subject.id}>{subject.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {selectedSubjectId ? (
                                        <>
                                            <PDFUpload subjectId={selectedSubjectId} session={session} />
                                            <FileUpload subjectId={selectedSubjectId} session={session} />
                                        </>
                                    ) : (
                                        <div className="no-subjects">
                                            <p>Selecciona una asignatura para cargar archivos.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Dashboard; 