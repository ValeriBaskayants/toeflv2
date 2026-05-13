import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AsyncMultipleChoiceSlice } from '@/store/Slices/MultipleChoiceSlice';
import type { AppDispatch, RootState } from '@/store/store';
import styles from './MultipleChoice.module.css';

export const MultipleChoiceList = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { data: questions, isLoading, error } = useSelector((state: RootState) => state.multipleChoice);

    const [answers, setAnswers] = useState<Record<string, number>>({});

    useEffect(() => {
        dispatch(AsyncMultipleChoiceSlice({ limit: 20 }));
    }, [dispatch]);

    const handleOptionClick = (questionId: string, optionIndex: number) => {
        if (answers[questionId] !== undefined) return;

        setAnswers(prev => ({
            ...prev,
            [questionId]: optionIndex
        }));
    };

    if (isLoading) return <div className={styles['loading']}>Загрузка вопросов...</div>;
    if (error) return <div className={styles['error']}>Ошибка: {error}</div>;
    if (!questions || questions.length === 0) return <div className={styles['empty']}>Вопросы не найдены.</div>;

    return (
        <div className={styles['container']}>
            <header className={styles['header']}>
                <div>
                    <h1 className={styles['title']}>База вопросов</h1>
                    <p className={styles['subtitle']}>Интерактивный предпросмотр Multiple Choice заданий</p>
                </div>
                <div className={styles['statsBadge']}>
                    Всего загружено: <span>{questions.length}</span>
                </div>
            </header>

            <div className={styles['grid']}>
                {questions.map((q) => {
                    const selectedAnswer = answers[q.id];
                    const isAnswered = selectedAnswer !== undefined;
                    const isCorrect = selectedAnswer === q.correctIndex;

                    return (
                        <div key={q.id} className={`${styles['card']} ${isAnswered ? styles['cardAnswered'] : ''}`}>
                            <div className={styles['cardHeader']}>
                                <div className={styles['badges']}>
                                    <span className={styles['badgeLevel']}>{q.level}</span>
                                    <span className={`${styles['badgeDifficulty']} ${styles[q.difficulty.toLowerCase()]}`}>
                                        {q.difficulty}
                                    </span>
                                </div>
                                {q.topic && <span className={styles['topic']}>#{q.topic}</span>}
                            </div>

                            <h3 className={styles['questionText']}>{q.question}</h3>

                            <div className={styles['optionsList']}>
                                {q.options.map((option, idx) => {
                                    let btnStateClass = '';

                                    if (isAnswered) {
                                        if (idx === q.correctIndex) {
                                            btnStateClass = styles['optionCorrect'];
                                        } else if (idx === selectedAnswer) {
                                            btnStateClass = styles['optionWrong'];
                                        } else {
                                            btnStateClass = styles['optionDisabled'];
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleOptionClick(q.id, idx)}
                                            className={`${styles['optionBtn']} ${btnStateClass}`}
                                            disabled={isAnswered}
                                        >
                                            <span className={styles['optionLetter']}>{String.fromCharCode(65 + idx)}</span>
                                            <span className={styles['optionText']}>{option}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {isAnswered && q.explanation && (
                                <div className={`${styles['explanation']} ${isCorrect ? styles['expSuccess'] : styles['expError']}`}>
                                    <div className={styles['expHeader']}>
                                        {isCorrect ? '🎉 Верно!' : '💡 Объяснение'}
                                    </div>
                                    <p className={styles['expText']}>{q.explanation}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};