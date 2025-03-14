const GameRoom = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const [gameRoom, setGameRoom] = useState<GameRoomType | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scoreA, setScoreA] = useState<number>(0);
    const [scoreB, setScoreB] = useState<number>(0);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportedUserId, setReportedUserId] = useState<number | null>(null);
    const [reportReason, setReportReason] = useState('');
    
    const isScrolling = useRef(false);
    const isFirstRender = useRef(true);

    const [isPerformingAction, setIsPerformingAction] = useState(false);

    const [gameHistory, setGameHistory] = useState<any[]>([]);

    const fetchData = useCallback(async (force = false) => {
    if (isScrolling.current && !force) return;
    
    try {
      setLoading(true);
      const [userData, roomData] = await Promise.all([
        userApi.getCurrentUser(),
        gameRoomApi.getGameRoom(parseInt(roomId || '0'))
      ]);

      setCurrentUser(userData);
      setGameRoom(roomData);
      
      if (roomData.status === 'completed') {
        try {
          const history = await userApi.getGameHistory();
          
          const roomHistory = history.filter(entry => entry.gameRoom.id === parseInt(roomId || '0'));
          
          if (userData) {
            const userEntry = roomHistory.find(entry => entry.user.id === userData.id);
            
            if (userEntry) {
              setGameHistory([userEntry]);
            }
          }
        } catch (historyError) {
        }
      }
      
      setError(null);
    } catch (err) {
      setError('Не удалось загрузить данные игровой комнаты. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    const handleScroll = () => {
      isScrolling.current = true;
      
      const timer = setTimeout(() => {
        isScrolling.current = false;
      }, 100);
      
      return () => clearTimeout(timer);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      fetchData(true);
      isFirstRender.current = false;
    }
    
    
    const intervalId = setInterval(() => {
      if (!isScrolling.current) {
        fetchData();
      }
    }, 10000);
    
    return () => clearInterval(intervalId);
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleStartTeamSelection = async () => {
    try {
      setIsPerformingAction(true);
      setLoading(true);
      const updatedRoom = await gameRoomApi.startTeamSelection(parseInt(roomId || '0'));
      setGameRoom(updatedRoom);
    } catch (err) {
      setError('Не удалось начать выбор команд. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
      setIsPerformingAction(false);
    }
  };

  const handleStartGame = async () => {
    try {
      setIsPerformingAction(true);
      setLoading(true);
      const updatedRoom = await gameRoomApi.startGame(parseInt(roomId || '0'));
      setGameRoom(updatedRoom);
    } catch (err) {
      setError('Не удалось начать игру. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
      setIsPerformingAction(false);
    }
  };

  const handleEndGame = async () => {
    try {
      setIsPerformingAction(true);
      setLoading(true);
      const updatedRoom = await gameRoomApi.endGame(parseInt(roomId || '0'));
      setGameRoom(updatedRoom);
    } catch (err) {
      setError('Не удалось завершить игру. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
      setIsPerformingAction(false);
    }
  };

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsPerformingAction(true);
      setLoading(true);
      
      const formattedScore = `${scoreA}:${scoreB}`;
      
      const result = await gameRoomApi.submitScore(parseInt(roomId || '0'), formattedScore);
      
      if (result.room) {
        setGameRoom(result.room);
      }
      
      setScoreA(0);
      setScoreB(0);
      
      const fetchRoomData = async () => {
        try {
          const updatedRoom = await gameRoomApi.getGameRoom(parseInt(roomId || '0'));
          setGameRoom(updatedRoom);
          setLoading(false);
        } catch (err) {
          console.error('Error fetching updated room data:', err);
          setLoading(false);
        }
      };
      
      
      setTimeout(fetchRoomData, 2000);
    } catch (err: any) {
      console.error('Error submitting score:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(`Ошибка: ${err.response.data.message}`);
      } else {
        setError('Не удалось отправить счет. Пожалуйста, попробуйте позже.');
      }
      setLoading(false);
      setIsPerformingAction(false);
    }
  };

  const handleReportPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportedUserId || !reportReason) return;
    
    try {
      setIsPerformingAction(true);
      setLoading(true);
      await gameRoomApi.reportPlayer(parseInt(roomId || '0'), reportedUserId, reportReason);
      setReportModalOpen(false);
      setReportedUserId(null);
      setReportReason('');
      alert('Жалоба отправлена успешно!');
    } catch (err) {
      setError('Не удалось отправить жалобу. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
      setIsPerformingAction(false);
    }
  };

  const openReportModal = (userId: number) => {
    setReportedUserId(userId);
    setReportModalOpen(true);
  };

  const isCreator = currentUser?.id === gameRoom?.creator.id;
  const isCaptainA = currentUser?.id === gameRoom?.captainA?.id;
  const isCaptainB = currentUser?.id === gameRoom?.captainB?.id;
  const isCaptain = isCaptainA || isCaptainB;

  const handleLeaveRoom = async () => {
    try {
      setIsPerformingAction(true);
      setLoading(true);
      await gameRoomApi.leaveGameRoom(parseInt(roomId || '0'));
      navigate('/games');
    } catch (err) {
      setError('Не удалось покинуть комнату. Пожалуйста, попробуйте позже.');
      setLoading(false);
      setIsPerformingAction(false);
    }
  };