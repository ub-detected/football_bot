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