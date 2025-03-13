const GameRoom = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const [gameRoom, setGameRoom] = useState<GameRoomType | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);п