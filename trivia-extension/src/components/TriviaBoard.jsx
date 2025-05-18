import React, { useState, useEffect, useRef } from 'react';
import '../App.css';

const FALLBACK_IMAGE = '/fallback.png';

const TriviaBoard = () => {
  const [triviaItems, setTriviaItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [playerScores, setPlayerScores] = useState({
    player1: { score: 0 },
    player2: { score: 0 },
  });
  const [playerAnswers, setPlayerAnswers] = useState({
    player1: '',
    player2: '',
  });
  const [timer, setTimer] = useState(null);
  const [isRoundOver, setIsRoundOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerReady, setPlayerReady] = useState({
    player1: false,
    player2: false,
  });
  const [avatars, setAvatars] = useState({
    player1: null,
    player2: null,
  });
  const [screenNames, setScreenNames] = useState({
    player1: '',
    player2: '',
  });
  const [isNightMode, setIsNightMode] = useState(false); // Night mode toggle state

  const videoRefs = {
    player1: useRef(null),
    player2: useRef(null),
  };

  const canvasRefs = {
    player1: useRef(null),
    player2: useRef(null),
  };

  // Fetch trivia data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const sources = [
          '/triviaData.json',
          '/stadiumData.json',
          '/gunData.json',
          '/gemstoneData.json',
          '/drinkData.json',
          '/dogData.json',
          '/carData.json',
        ];
        
        // Fetch data for all categories
        const allData = await Promise.all(sources.map((src) => fetch(src).then((res) => res.json())));
  
        // Step 1: Determine how many questions to pick from each category
        const questionsPerCategory = Math.floor(36 / allData.length);
        const remainingQuestions = 36 - questionsPerCategory * allData.length;
  
        // Step 2: Randomly shuffle and pick questions from each category
        let selectedItems = [];
        allData.forEach(categoryData => {
          // Shuffle category data to ensure randomness within the category
          const shuffledCategoryData = categoryData.sort(() => Math.random() - 0.5);
          selectedItems = selectedItems.concat(shuffledCategoryData.slice(0, questionsPerCategory));
        });
  
        // Step 3: If there are remaining questions, fill them randomly from the pool of all categories
        const allQuestionsFlat = allData.flat();
        const remainingItems = allQuestionsFlat.filter(item => !selectedItems.includes(item));
        const shuffledRemainingItems = remainingItems.sort(() => Math.random() - 0.5);
  
        // Add the remaining questions to make sure we fill exactly 36
        selectedItems = selectedItems.concat(shuffledRemainingItems.slice(0, remainingQuestions));
  
        // Final shuffle to mix the categories
        const finalTriviaItems = selectedItems.sort(() => Math.random() - 0.5);
  
        setTriviaItems(finalTriviaItems);
        
      } catch (err) {
        console.error('Error loading trivia:', err);
      }
    };
  
    fetchData();
  }, []);
  
  
  // Load saved avatars and screen names
  useEffect(() => {
    const savedAvatars = {
      player1: localStorage.getItem('avatar_player1'),
      player2: localStorage.getItem('avatar_player2'),
    };
    const savedScreenNames = {
      player1: localStorage.getItem('screenName_player1'),
      player2: localStorage.getItem('screenName_player2'),
    };
    setAvatars(savedAvatars);
    setScreenNames(savedScreenNames);
  }, []);

  // Stop camera after each player captures their avatar
  const stopCamera = (player) => {
    const video = videoRefs[player].current;
    const stream = video?.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
  };

  // Capture avatar and stop camera
  const captureAvatar = (player) => {
    const canvas = canvasRefs[player].current;
    const video = videoRefs[player].current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, 150, 150);
    const dataUrl = canvas.toDataURL('image/png');

    localStorage.setItem(`avatar_${player}`, dataUrl);
    setAvatars((prev) => ({ ...prev, [player]: dataUrl }));

    // Stop the camera after capturing the avatar
    stopCamera(player);
  };

  // Start the camera feed for the player
  const startCamera = (player) => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRefs[player].current) {
          videoRefs[player].current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error(`Error starting camera for ${player}:`, err);
      });
  };

  // Mark player as ready
  const handlePlayerReady = (player) => {
    if (!avatars[player]) {
      alert('Please capture an avatar.');
      return;
    }
    if (!screenNames[player]) {
      alert('Please enter a screen name.');
      return;
    }
    // Mark player as ready
    setPlayerReady((prev) => {
      const updatedReady = { ...prev, [player]: true };

      // Check if both players are ready and start the game if so
      if (updatedReady.player1 && updatedReady.player2) {
        setGameStarted(true); // Game starts after both players are ready
      }
      return updatedReady;
    });
  };

  // The game logic and functionality here
  useEffect(() => {
    if (gameStarted && triviaItems.length && currentQuestionIndex < triviaItems.length) {
      const item = triviaItems[currentQuestionIndex];
      setSelected(item);

      // Stop cameras for both players when the game starts
      ['player1', 'player2'].forEach((player) => {
        const video = videoRefs[player].current;
        const stream = video?.srcObject;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          video.srcObject = null;
        }
      });

      if (item?.facts) {
        const utterance = new SpeechSynthesisUtterance(item.facts);
        utterance.onend = () => {
          setTimer(10);
        };
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
      }
    }
  }, [gameStarted, currentQuestionIndex, triviaItems]);

  // Handle timer and round over logic
  useEffect(() => {
    if (!gameStarted || timer === null || isRoundOver) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev === 1) {
          clearInterval(interval);
          evaluateAnswers();
          if (currentQuestionIndex + 1 >= triviaItems.length) {
            setIsRoundOver(true);
          } else {
            setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, gameStarted]);

  // Evaluate players' answers and update scores
  const evaluateAnswers = () => {
    const correct = triviaItems[currentQuestionIndex]?.correctAnswer?.toLowerCase();
    const newScores = { ...playerScores };

    Object.entries(playerAnswers).forEach(([player, answer]) => {
      if (answer.trim().toLowerCase() === correct) {
        newScores[player].score += 10;
      }
    });

    setPlayerScores(newScores);
    setPlayerAnswers({ player1: '', player2: '' });
  };

  // Toggle night/day mode
  const toggleNightMode = () => {
    setIsNightMode((prev) => !prev);
  };
    // Apply body class for light/dark mode
    useEffect(() => {
      document.body.classList.toggle('dark-mode', isNightMode);
      document.body.classList.toggle('light-mode', !isNightMode);
    }, [isNightMode]);
  
  return (
    <div className={`board ${isNightMode ? 'night' : 'day'}`} style={{ minHeight: '100vh', overflowY: 'auto' }}>
      {/* Fixed player info and night mode toggle */}
      <div className="fixed-elements">
        <div style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 100 }}>
          {Object.keys(playerScores).map((playerId) => (
            <div
              key={playerId}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}
            >
              {avatars[playerId] && (
                <img className="avatar-image" src={avatars[playerId]} alt="Avatar" />
              )}
              <div className="player-info">
                {screenNames[playerId] || playerId}: {playerScores[playerId].score} points
              </div>
            </div>
          ))}
        </div>

        {/* Night/Day Mode Toggle Button */}
        <button
          onClick={toggleNightMode}
          className="night-day-toggle"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 100,
            padding: '10px',
            backgroundColor: isNightMode ? '#333' : '#fff',
            color: isNightMode ? '#fff' : '#333',
            border: 'none',
            borderRadius: '5px',
          }}
        >
          {isNightMode ? 'Switch to Day Mode' : 'Switch to Night Mode'}
        </button>
      </div>

      {/* Avatar selection */}
      {!gameStarted && (
        <div className="avatar-modal">
          {['player1', 'player2'].map((playerId) => (
            <div key={playerId} className="avatar-box">
              <h3>{playerId} - Create Avatar</h3>
              {!avatars[playerId] && (
                <>
                  <video ref={videoRefs[playerId]} autoPlay width="150" height="150" />
                  <canvas ref={canvasRefs[playerId]} style={{ display: 'none' }} width="150" height="150" />
                  <div>
                    <button onClick={() => startCamera(playerId)}>Start Camera</button>
                    <button onClick={() => captureAvatar(playerId)}>Capture Avatar</button>
                  </div>
                </>
              )}
              {avatars[playerId] && (
                <>
                  <img
                    src={avatars[playerId]}
                    alt="Avatar"
                    width="150"
                    height="150"
                    style={{ objectFit: 'cover' }}
                  />
                  <input
                    type="text"
                    placeholder="Enter screen name"
                    value={screenNames[playerId]}
                    onChange={(e) => setScreenNames((prev) => ({ ...prev, [playerId]: e.target.value }))}
                  />
                  <button onClick={() => handlePlayerReady(playerId)}>Ready</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Game Grid */}
      <div className="grid">
        {triviaItems.map((item, index) => (
          <div
            key={index}
            className={`cell ${index === currentQuestionIndex ? 'active-question' : ''}`}
            style={{ backgroundImage: `url(${item.imageUrl || FALLBACK_IMAGE})` }}
          />
        ))}
      </div>

      {/* Modal: Question */}
      {selected && gameStarted && !isRoundOver && (
        <div className="modal-overlay">
          <div className="modal">
            <img
              src={selected.imageUrl || FALLBACK_IMAGE}
              alt="Selected"
              onError={(e) => (e.target.src = FALLBACK_IMAGE)}
            />
            <p style={{ fontWeight: 'bold', marginBottom: '16px', maxHeight: '100px', overflowY: 'auto' }}>
              {selected.facts}
            </p>
            <h2>{selected.question}</h2>

            {/* Answer inputs */}
            <div>
              <label>{screenNames.player1 || 'Player 1'} Answer:</label>
              <input
                type="text"
                value={playerAnswers.player1}
                onChange={(e) => setPlayerAnswers((prev) => ({ ...prev, player1: e.target.value }))}
              />
            </div>
            <div>
              <label>{screenNames.player2 || 'Player 2'} Answer:</label>
              <input
                type="text"
                value={playerAnswers.player2}
                onChange={(e) => setPlayerAnswers((prev) => ({ ...prev, player2: e.target.value }))}
              />
            </div>

            {/* Timer at the bottom */}
            <p style={{ marginTop: '20px', fontSize: '18px' }}>
              <strong>Time remaining:</strong> {timer !== null ? timer : 'Waiting...'}
            </p>
          </div>
        </div>
      )}

      {/* Game Over */}
      {isRoundOver && (
        <div className="game-over">
          <h2>Game Over!</h2>
          <p>Final Scores:</p>
          {Object.keys(playerScores).map((playerId) => (
            <p key={playerId}>
              {screenNames[playerId] || playerId}: {playerScores[playerId].score} points
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default TriviaBoard;
