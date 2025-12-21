import { useState } from "react";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
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
      
      // ⬇️ ここを修正！「gemini-pro」に戻して、安全設定はキープします
      const model = genAI.getGenerativeModel({ 
        model: "gemini-pro", // 安定版に変更
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

      // JSONの抽出
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const json = JSON.parse(jsonMatch[0]);
        setQuestion(json);
        setScreen("quiz");
      } else {
        throw new Error("AIが正しい形式（JSON）で返答しませんでした:\n" + text.substring(0, 100));
      }
    } catch (err) {
      console.error(err);
      // ⬇️ エラーの正体を画面に表示するように変更しました
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

  // --- 画面表示 ---

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
        {error && <p className="error" style={{whiteSpace: 'pre-wrap'}}>{error}</p>}
      </div>
    );
  }

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
        {error && <div className="error-overlay" onClick={() => setError(null)}>{error}<br/><small>(タップして閉じる)</small></div>}
      </div>
    );
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