import { useState } from "react";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// ↓ Clerkの機能をインポート
import { useUser, SignInButton, UserButton } from "@clerk/clerk-react";
import "./App.css";

const CATEGORIES = [
  "人間の尊厳と自立",
  "人間関係とコミュニケーション",
  "社会の理解",
  "介護の基本",
  "コミュニケーション技術",
  "生活支援技術",
  "介護過程",
  "発達と老化の理解",
  "認知症の理解",
  "障害の理解",
  "こころとからだのしくみ",
  "医療的ケア",
  "総合問題",
];

function App() {
  // ▼▼▼ 追加: Clerkのログイン状態を取得するフック ▼▼▼
  const { isSignedIn, isLoaded } = useUser();

  // 既存の状態（State）
  const [question, setQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [screen, setScreen] = useState("home");
  const [selectedCategory, setSelectedCategory] = useState(null);

  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  const generateQuestion = async (category = null) => {
    if (!API_KEY) {
      setError("APIキーが設定されていません。");
      return;
    }

    setLoading(true);
    setError(null);
    setQuestion(null);
    setSelectedOption(null);
    setResult(null);

    let promptText = "介護福祉士国家試験の模擬問題（4択）を1問作成してください。";
    
    if (category) {
      promptText += `\n出題分野は「${category}」に限定してください。`;
      if (category === "総合問題") {
        promptText += "（事例問題や、科目を横断するような応用問題にしてください）";
      }
    } else {
      promptText += "\n分野はランダムで、本番形式に近い問題にしてください。";
    }

    promptText += `
    出力は以下のJSON形式のみで、余計な文字（markdownの記号など）を含めないでください:
    {
      "category": "分野名",
      "text": "問題文",
      "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "correctAnswer": "正解の選択肢（文字列そのもの）",
      "explanation": "解説"
    }
    `;

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      });

      const result = await model.generateContent(promptText);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const json = JSON.parse(jsonMatch[0]);
        setQuestion(json);
        setScreen("quiz");
      } else {
        throw new Error("AIが正しい形式（JSON）で返答しませんでした");
      }
    } catch (err) {
      console.error(err);
      let msg = "エラーが発生しました。もう一度お試しください。";
      if (err.message) msg += `\n(詳細: ${err.message})`;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const checkAnswer = (option) => {
    setSelectedOption(option);
    if (option === question.correctAnswer) {
      setResult("correct");
    } else {
      setResult("incorrect");
    }
  };

  const goHome = () => {
    setScreen("home");
    setQuestion(null);
    setResult(null);
  };

  // ▼▼▼ 追加: 認証情報の読み込み中はローディングを表示 ▼▼▼
  if (!isLoaded) {
    return <div className="container" style={{textAlign:"center", marginTop:"50px"}}>認証情報を確認中...</div>;
  }

  // ▼▼▼ 追加: ログインしていない場合、ここ専用の画面を返して終了する ▼▼▼
  if (!isSignedIn) {
    return (
      <div className="container home-screen" style={{ textAlign: "center", justifyContent: "center" }}>
        <h1 className="home-title">介護福祉士国家試験対策</h1>
        <p className="home-subtitle">
          ログインして学習データを保存しましょう。<br/>
          (現在はGoogleアカウントのみ対応)
        </p>
        <div style={{ marginTop: "30px" }}>
          <SignInButton mode="modal">
            {/* 既存のボタンスタイルを流用してきれいに見せます */}
            <button className="menu-card primary-card" style={{ width: "auto", margin: "0 auto", padding: "15px 40px" }}>
              <div className="card-content">
                <h2>Googleでログインして開始</h2>
              </div>
              <div className="card-icon">🔑</div>
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  // --- 共通ローディング ---
  if (loading) {
    return (
      <div className="container" style={{ textAlign: "center", paddingTop: "100px" }}>
        <div className="loading-overlay">
          <p style={{fontSize: "1.2rem", fontWeight: "bold", color: "#555"}}>問題を生成中...🤖</p>
          <div style={{ marginTop: "20px", fontSize: "3rem" }}>⏳</div>
        </div>
      </div>
    );
  }

  // --- 🏠 ホーム画面 (デザイン変更) ---
  if (screen === "home") {
    return (
      <div className="container home-screen">
        {/* ▼▼▼ 追加: ログイン中のみ右上にユーザーアイコンを表示 ▼▼▼ */}
        <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 10 }}>
          <UserButton />
        </div>

        <h1 className="home-title">介護福祉士国家試験対策</h1>
        <p className="home-subtitle">
          AIがあなたのために最適化された問題を作成。<br/>
          効率的に学習を進めましょう。
        </p>
        
        <div className="menu-buttons">
          {/* 模擬試験カード */}
          <button 
            className="menu-card primary-card"
            onClick={() => generateQuestion(null)}
          >
            <div className="card-content">
              <h2>模擬試験モード</h2>
              <p>本番形式のランダム出題で実力を試す</p>
            </div>
            <div className="card-icon">📝</div>
          </button>
          
          {/* 科目別カード */}
          <button 
            className="menu-card secondary-card"
            onClick={() => setScreen("categories")}
          >
            <div className="card-content">
              <h2>科目別練習モード</h2>
              <p>苦手な分野を集中的に克服する</p>
            </div>
            <div className="card-icon">📚</div>
          </button>
        </div>
        {error && <p className="error" style={{whiteSpace: 'pre-wrap'}}>{error}</p>}
        <footer style={{ marginTop: "50px", borderTop: "1px solid #eee", padding: "20px", color: "#666", fontSize: "0.8rem", textAlign: "center" }}>
          <p>介護福祉士国家試験対策アプリ Ver 1.0.1</p>
          <p>Powered by Gemini & Clerk</p>
        </footer>
      </div>
    );
  }

  // --- 📚 科目選択画面 ---
  if (screen === "categories") {
    return (
      <div className="container category-screen">
        <h2>学習する科目を選んでください</h2>
        <div className="category-list">
          {CATEGORIES.map((cat) => (
            <button 
              key={cat} 
              className="category-btn"
              onClick={() => {
                setSelectedCategory(cat);
                generateQuestion(cat);
              }}
            >
              {cat}
            </button>
          ))}
        </div>
        <button className="back-btn" onClick={goHome}>
          ↩ ホームに戻る
        </button>
        {error && <div className="error-overlay" onClick={() => setError(null)}>{error}<br/><small>(タップして閉じる)</small></div>}
      </div>
    );
  }

  // --- 📝 クイズ画面 ---
  if (!question) {
     return <div className="container">読み込みエラー。ホームに戻ってください。</div>;
  }

  return (
    <div className="container quiz-screen">
      <div className="header">
        <span className="badge">{question?.category || (selectedCategory ?? "模擬試験")}</span>
        <button className="close-btn" onClick={goHome}>終了</button>
      </div>

      <div className="card">
        <h2 className="question-text">{question.text}</h2>

        <div className="options">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => checkAnswer(option)}
              disabled={result !== null}
              className={`option-btn ${
                result !== null
                  ? option === question.correctAnswer
                    ? "correct"
                    : option === selectedOption
                    ? "incorrect"
                    : ""
                  : ""
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {result && (
          <div className={`result-area ${result}`}>
            <h3>{result === "correct" ? "🎉 正解！" : "😢 残念..."}</h3>
            <p className="explanation">
              <strong>【解説】</strong><br />
              {question.explanation}
            </p>
            <button 
              className="next-btn" 
              onClick={() => generateQuestion(selectedCategory)}
            >
              次の問題へ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;