import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./App.css";

// 🔹 科目リスト（ここに追加しました！）
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
  const [question, setQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🔹 画面の状態管理（'home' | 'categories' | 'quiz'）
  const [screen, setScreen] = useState("home");
  const [selectedCategory, setSelectedCategory] = useState(null);

  // APIキーの読み込み
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  // 問題を生成する関数
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

    // 🔹 プロンプト（命令文）の作成
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
    出力は以下のJSON形式のみで、余計な文字を含めないでください:
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
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(promptText);
      const response = await result.response;
      const text = response.text();

      // JSONを抽出・解析
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const json = JSON.parse(jsonMatch[0]);
        setQuestion(json);
        setScreen("quiz"); // クイズ画面へ移動
      } else {
        throw new Error("JSON形式での取得に失敗しました");
      }
    } catch (err) {
      console.error(err);
      setError("問題の生成に失敗しました。もう一度試してください。");
    } finally {
      setLoading(false);
    }
  };

  // 答え合わせ
  const checkAnswer = (option) => {
    setSelectedOption(option);
    if (option === question.correctAnswer) {
      setResult("correct");
    } else {
      setResult("incorrect");
    }
  };

  // ホームに戻る
  const goHome = () => {
    setScreen("home");
    setQuestion(null);
    setResult(null);
  };

  // ---------------------------------------------
  // 🖥️ 画面表示（レンダリング）
  // ---------------------------------------------

  // ① 🏠 ホーム画面
  if (screen === "home") {
    return (
      <div className="container home-screen">
        <h1>介護福祉士<br />国家試験対策</h1>
        <p>AIがあなたのために無限に問題を作成します</p>
        
        <div className="menu-buttons">
          <button 
            className="menu-btn primary-btn"
            onClick={() => generateQuestion(null)}
            disabled={loading}
          >
            {loading ? "作成中..." : "📝 模擬試験（ランダム出題）"}
          </button>
          
          <button 
            className="menu-btn secondary-btn"
            onClick={() => setScreen("categories")}
            disabled={loading}
          >
            📚 科目別練習モード
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  // ② 📚 科目選択画面
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
              disabled={loading}
            >
              {cat}
            </button>
          ))}
        </div>
        <button className="back-btn" onClick={goHome} disabled={loading}>
          ↩ ホームに戻る
        </button>
        {loading && <div className="loading-overlay">問題を作成中...</div>}
      </div>
    );
  }

  // ③ 📝 クイズ画面（今までの画面）
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