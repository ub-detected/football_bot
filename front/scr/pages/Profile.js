const Profile = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [historyLoading, setHistoryLoading] = useState(true);
    const isFirstRender = useRef(true);
    const fetchUserData = useCallback(async () => {
        try {
          setLoading(true);
          const userData = await userApi.getCurrentUser();
          setUser(userData);
          setError(null);
        } catch (err) {
          setError('Не удалось загрузить данные пользователя. Пожалуйста, попробуйте позже.');
        } finally {
          setLoading(false);
        }
      }, []);
    useEffect(() => {
        if (isFirstRender.current) {
          fetchUserData().then(() => {
            isFirstRender.current = false;
          });
        }
      }, [fetchUserData]);
}
export default Profile;