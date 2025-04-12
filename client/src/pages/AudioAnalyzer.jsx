import React, { useState, useRef } from 'react';

const AudioAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  // Hard-coded API key - replace with your actual key
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  // Define styles
  const styles = {
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '24px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)'
    },
    errorBox: {
      marginBottom: '16px',
      padding: '12px',
      backgroundColor: '#fef3c7',
      border: '1px solid #fbbf24',
      color: '#92400e',
      borderRadius: '4px',
      fontSize: '14px',
      fontFamily: 'monospace',
      whiteSpace: 'pre-wrap'
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      marginBottom: '24px',
      textAlign: 'center',
      color: '#3b82f6'
    },
    section: {
      marginBottom: '24px'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#374151'
    },
    sectionDescription: {
      fontSize: '14px',
      color: '#4b5563'
    },
    inputContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      marginBottom: '24px'
    },
    inputGroup: {
      width: '100%'
    },
    label: {
      display: 'block',
      color: '#374151',
      marginBottom: '8px'
    },
    fileInput: {
      width: '100%',
      padding: '8px',
      border: '1px solid #d1d5db',
      borderRadius: '4px'
    },
    divider: {
      textAlign: 'center',
      margin: '8px 0'
    },
    buttonGroup: {
      display: 'flex',
      gap: '8px'
    },
    button: {
      flex: 1,
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    recordButton: {
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    stopButton: {
      backgroundColor: '#ef4444',
      color: 'white'
    },
    analyzeButton: {
      width: '100%',
      padding: '12px 16px',
      backgroundColor: '#22c55e',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontWeight: '700',
      cursor: 'pointer'
    },
    disabledButton: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed'
    },
    audioPreview: {
      marginBottom: '24px'
    },
    fileName: {
      color: '#374151',
      marginBottom: '8px'
    },
    audioPlayer: {
      width: '100%'
    },
    results: {
      marginTop: '24px'
    },
    resultsTitle: {
      fontSize: '20px',
      fontWeight: '700',
      marginBottom: '8px'
    },
    resultsContent: {
      padding: '16px',
      backgroundColor: '#f3f4f6',
      borderRadius: '4px',
      whiteSpace: 'pre-line'
    },
    footer: {
      marginTop: '32px',
      fontSize: '14px',
      color: '#6b7280'
    },
    footerText: {
      margin: '4px 0'
    }
  };
  
  // Media query styles for larger screens
  if (window.innerWidth >= 768) {
    styles.inputContainer = {
      ...styles.inputContainer,
      flexDirection: 'row'
    };
    styles.divider = {
      ...styles.divider,
      margin: '0',
      display: 'flex',
      alignItems: 'center'
    };
  }
  
  // Handle file upload
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.includes('audio')) {
      setFile(selectedFile);
      setError('');
    } else {
      setFile(null);
      setError('Please select a valid audio file');
    }
  };
  
  // Start recording from microphone
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], "recording.wav", { type: 'audio/wav' });
        setFile(audioFile);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError('');
    } catch (err) {
      setError('Error accessing microphone: ' + err.message);
    }
  };

  
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Analyze audio with ChatGPT API
  const analyzeAudio = async () => {
    if (!file) {
      setError('Please upload or record an audio file first');
      return;
    }
    
    try {
      setIsAnalyzing(true);
      setError('');
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'text');
      
      // Call OpenAI API with FormData
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to analyze audio';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || 'Failed to analyze audio';
        } catch (e) {
          // If we can't parse JSON, use the status text
          errorMessage = `API Error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const transcription = await response.text();
      
      // Now analyze the transcription with ChatGPT
      const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert audio analysis assistant. Your job is to provide a clear, concise summary of what the audio is about along with key points, topics, and any other relevant details. Focus on extracting the main themes, purpose, and important information from the transcription.'
            },
            {
              role: 'user',
              content: `Please analyze this audio transcription and provide: 
1. A brief summary of what the audio is about (1-2 sentences)
2. Main topics/themes discussed
3. Key points or important details
4. Context or purpose of the recording (if apparent)
5. Any notable elements (tone, style, format)

Transcription: "${transcription}"`
            }
          ]
        })
      });
      
      if (!chatResponse.ok) {
        const errorData = await chatResponse.json();
        throw new Error(errorData.error?.message || 'Failed to analyze transcription');
      }
      
      const chatData = await chatResponse.json();
      setAnalysis(`${chatData.choices[0].message.content}

---

Full Transcription:
"${transcription}"
      `);
      
    } catch (err) {
      setError('Error analyzing audio: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <div style={styles.container}>
      {/* Debug information */}
      {error && (
        <div style={styles.errorBox}>
          <strong>Debug Info:</strong> {error}
        </div>
      )}
      <h1 style={styles.title}>Audio Content Summarizer</h1>
      
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Audio Analysis Tool</h2>
        <p style={styles.sectionDescription}>Upload or record audio to get a comprehensive summary and key details</p>
      </div>
      
      <div style={styles.inputContainer}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Upload Audio File:</label>
          <input 
            type="file" 
            accept="audio/*" 
            onChange={handleFileChange} 
            style={styles.fileInput}
          />
        </div>
        
        <div style={styles.divider}>
          <p>OR</p>
        </div>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>Record Audio:</label>
          <div style={styles.buttonGroup}>
            {!isRecording ? (
              <button 
                onClick={startRecording} 
                style={{...styles.button, ...styles.recordButton}}
              >
                Start Recording
              </button>
            ) : (
              <button 
                onClick={stopRecording} 
                style={{...styles.button, ...styles.stopButton}}
              >
                Stop Recording
              </button>
            )}
          </div>
        </div>
      </div>
      
      {file && (
        <div style={styles.audioPreview}>
          <p style={styles.fileName}>Selected file: {file.name}</p>
          <audio controls style={styles.audioPlayer}>
            <source src={URL.createObjectURL(file)} type={file.type} />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
      
      <button 
        onClick={analyzeAudio} 
        disabled={isAnalyzing || !file}
        style={{
          ...styles.analyzeButton, 
          ...(isAnalyzing || !file ? styles.disabledButton : {})
        }}
      >
        {isAnalyzing ? 'Processing...' : 'Summarize Audio Content'}
      </button>
      
      {analysis && (
        <div style={styles.results}>
          <h2 style={styles.resultsTitle}>Analysis Results</h2>
          <div style={styles.resultsContent}>
            {analysis}
          </div>
        </div>
      )}
      
      <div style={styles.footer}>
        <p style={styles.footerText}>Note: Your audio is processed locally and then sent to OpenAI's API for transcription and analysis.</p>
        <p style={styles.footerText}>The summary provides the main content, topics, and context of your audio recording.</p>
      </div>
    </div>
  );
};

export default AudioAnalyzer;