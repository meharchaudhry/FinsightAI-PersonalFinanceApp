import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Send, Bot, User, Target, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Chat = () => {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChatHistory();
    fetchGoals();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get(`${API}/chat/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await axios.get(`${API}/goals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGoals(response.data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/chat`,
        { message: input },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async () => {
    if (!goalInput.trim()) return;

    try {
      const response = await axios.post(
        `${API}/goals`,
        {
          goal: goalInput,
          target_amount: targetAmount ? parseFloat(targetAmount) : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGoals([response.data, ...goals]);
      setGoalInput('');
      setTargetAmount('');
      setShowGoalForm(false);
      toast.success('Goal added!');
    } catch (error) {
      console.error('Error adding goal:', error);
      toast.error('Failed to add goal');
    }
  };

  const handleDeleteGoal = async (id) => {
    try {
      await axios.delete(`${API}/goals/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGoals(goals.filter(g => g.id !== id));
      toast.success('Goal deleted');
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-12" data-testid="chat-page">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-serif text-4xl md:text-6xl leading-tight mb-2" data-testid="chat-title">
            Finance Advisor
          </h1>
          <p className="text-muted-foreground text-lg">Ask questions about your spending and financial goals</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat Area */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card border border-border/60 rounded-2xl overflow-hidden"
              style={{ height: 'calc(100vh - 320px)', minHeight: '500px' }}
            >
              {/* Messages */}
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="chat-messages">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center">
                      <div>
                        <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                        <p className="text-muted-foreground text-lg mb-2">Start a conversation</p>
                        <p className="text-sm text-muted-foreground">Try: "How much did I spend on groceries?"</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        data-testid={`chat-message-${msg.role}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            <Bot className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground'
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-primary-foreground" />
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                  {loading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                      <div className="bg-secondary rounded-2xl px-6 py-4">
                        <div className="flex gap-2">
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-border p-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask about your finances..."
                      className="flex-1 bg-secondary/50 border-0 focus:ring-2 focus:ring-primary/20 h-12 px-4 rounded-lg font-sans"
                      disabled={loading}
                      data-testid="chat-input"
                    />
                    <button
                      onClick={handleSend}
                      disabled={loading || !input.trim()}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 px-6 rounded-lg btn-scale disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="send-button"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Goals Sidebar */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card border border-border/60 rounded-2xl p-6"
              data-testid="goals-panel"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-accent" />
                  <h2 className="font-serif text-xl">Financial Goals</h2>
                </div>
                <button
                  onClick={() => setShowGoalForm(!showGoalForm)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                  data-testid="add-goal-button"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {showGoalForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4 space-y-3 p-4 bg-secondary/30 rounded-lg"
                  data-testid="goal-form"
                >
                  <input
                    type="text"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    placeholder="Enter your goal..."
                    className="w-full bg-card border-0 focus:ring-2 focus:ring-primary/20 h-10 px-4 rounded-lg font-sans text-sm"
                    data-testid="goal-input"
                  />
                  <input
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="Target amount (optional)"
                    className="w-full bg-card border-0 focus:ring-2 focus:ring-primary/20 h-10 px-4 rounded-lg font-sans text-sm"
                    data-testid="goal-amount-input"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddGoal}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm btn-scale"
                      data-testid="save-goal-button"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowGoalForm(false);
                        setGoalInput('');
                        setTargetAmount('');
                      }}
                      className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-lg text-sm btn-scale"
                      data-testid="cancel-goal-button"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="space-y-3">
                {goals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No goals yet. Add one to get started!</p>
                ) : (
                  goals.map((goal, index) => (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-secondary/30 rounded-lg border border-border/30"
                      data-testid={`goal-item-${index}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium mb-1">{goal.goal}</p>
                          {goal.target_amount && (
                            <p className="text-sm text-muted-foreground font-mono">
                              Target: ${goal.target_amount?.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="p-1 hover:bg-accent/10 rounded transition-colors"
                          data-testid={`delete-goal-${index}`}
                        >
                          <Trash2 className="w-4 h-4 text-accent" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Suggested Questions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border/60 rounded-2xl p-6"
            >
              <h3 className="font-serif text-lg mb-4">Suggested Questions</h3>
              <div className="space-y-2">
                {[
                  "How much have I spent this month?",
                  "What's my biggest expense category?",
                  "Help me save $500 this month",
                  "How can I reduce my dining expenses?"
                ].map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(question)}
                    className="w-full text-left text-sm p-3 hover:bg-secondary rounded-lg transition-colors"
                    data-testid={`suggested-question-${idx}`}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
