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