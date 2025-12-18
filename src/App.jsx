import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// 環境変数からAPIキーを取得
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

const App = () => {
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState(null);
  const [keyInput, setKeyInput] = useState(apiKey);
  const [useManualKey, setUseManualKey] = useState(!apiKey);

  const generateProblem = async () => {
    setLoading(true);
    setError(null);
    setQuiz(null);
    setSelectedOption(null);
    setShowResult(false);

    try {
      // APIキーの確認
      const effectiveKey = useManualKey ? keyInput : apiKey;
      if (!effectiveKey) throw new Error('APIキーが設定されていません');

      const genAI = new GoogleGenerativeAI(effectiveKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `
        介護福祉士国家試験レベルの4択問題を作成してください。
        以下のJSON形式のみを出力してください。余計なマークダウン( \`\`\`json など)は不要です。
        
        {
          "question": "問題文",
          "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
          "answerIndex": 0,
          "explanation": "解説文"
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      console.log('AIからの生データ:', text); // デバッグ用

      // よくあるエラー：Markdown記号を取り除く処理
      text = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const json = JSON.parse(text);
      setQuiz(json);
    } catch (err) {
      console.error('詳細なエラー:', err);
      // エラーの中身を画面に表示する
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = (index) => {
    setSelectedOption(index);
    setShowResult(true);
  };

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4 font-sans text-gray-800">
      {/* エラー表示エリア（デバッグ用） */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg max-w-md w-full break-words">
          <div className="flex items-center gap-2 font-bold mb-1">
            <AlertCircle size={20} /> エラーが発生しました
          </div>
          <p className="text-sm font-mono">{error}</p>
        </div>
      )}

      {!quiz && !loading && (
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="flex justify-center mb-4 text-green-500">
            <BookOpen size={48} />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-green-700">
            介護福祉士 模擬試験
          </h1>
          <p className="text-gray-500 mb-6">
            Gemini APIを利用して無限に問題を生成します
          </p>

          {useManualKey && (
            <input
              type="text"
              placeholder="APIキーを入力 (AIza...)"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full mb-4 p-2 border rounded"
            />
          )}

          <button
            onClick={generateProblem}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full transition duration-300 shadow-md flex items-center justify-center gap-2"
          >
            学習を始める
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center">
          <Loader2
            className="animate-spin text-green-600 mx-auto mb-2"
            size={48}
          />
          <p className="text-green-700 font-medium">
            AIが問題を考えています...
          </p>
        </div>
      )}

      {quiz && (
        <div className="bg-white p-6 rounded-xl shadow-xl max-w-lg w-full">
          <div className="mb-4">
            <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
              問題
            </span>
          </div>
          <h2 className="text-xl font-bold mb-6 leading-relaxed">
            {quiz.question}
          </h2>

          <div className="space-y-3">
            {quiz.options.map((option, index) => (
              <button
                key={index}
                onClick={() => !showResult && handleOptionClick(index)}
                disabled={showResult}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  showResult
                    ? index === quiz.answerIndex
                      ? 'bg-green-100 border-green-500 text-green-900'
                      : index === selectedOption
                      ? 'bg-red-100 border-red-500 text-red-900'
                      : 'bg-gray-50 border-gray-200'
                    : 'border-gray-200 hover:border-green-400 hover:bg-green-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{option}</span>
                  {showResult && index === quiz.answerIndex && (
                    <CheckCircle className="text-green-600" />
                  )}
                  {showResult &&
                    index === selectedOption &&
                    index !== quiz.answerIndex && (
                      <XCircle className="text-red-500" />
                    )}
                </div>
              </button>
            ))}
          </div>

          {showResult && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 animate-fade-in">
              <h3 className="font-bold text-yellow-800 mb-2">解説</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                {quiz.explanation}
              </p>
              <button
                onClick={generateProblem}
                className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700"
              >
                次の問題へ
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
