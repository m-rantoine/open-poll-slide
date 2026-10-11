import { type HTMLAttributes, type ReactNode, useState } from 'react';
import type { PollLanguage } from '../lib/locale-store';
import type {
  InteractiveQuestion,
  NumberQuestion,
  OpenTextQuestion,
  PointsQuestion,
  RankingQuestion,
  ScaleQuestion,
} from '../lib/sdk';
import { format, useLocale } from '../lib/use-locale';
import { liveErrorMessage } from './errors';
import { useLive } from './live-context';
import { type FrameCtx, QuestionFrame } from './question-frame';
import { QuestionResults } from './question-results';
import { BAD, FONT, GOOD, INK } from './question-style';
import { PointsPane, RankingPane, ScalePane } from './rating-panes';
import { TextEntry } from './text-entry';
import type { LiveData } from './use-live-session';

type RatingQuestion = ScaleQuestion | RankingQuestion | PointsQuestion;
type TextQuestion = NumberQuestion | OpenTextQuestion;

const slideFont = 'min(40px, 5.2cqh)';

/** This participant's saved item-to-value answers for a placement question. */
function savedValues(data: LiveData | undefined, id: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of data?.myPlacements[id] ?? []) out[p.item_id] = p.zone_id;
  return out;
}

function defaultOrder(question: RankingQuestion, values: Record<string, string>): string[] {
  const ids = question.items.map((i) => i.id);
  if (Object.keys(values).length === 0) return ids;
  return ids.slice().sort((a, b) => Number(values[a] ?? 99) - Number(values[b] ?? 99));
}

/** Shared by the slide component and the phone card for scale, ranking and points. */
export function useRatingParticipant(question: RatingQuestion) {
  const live = useLive();
  const t = useLocale();
  const [failure, setFailure] = useState<string | null>(null);
  const data = live?.data;
  const values = savedValues(data, question.id);
  const state = data?.states[question.id]?.state ?? 'locked';
  const submitted = Boolean(data?.mine[question.id]);
  const interactive = Boolean(live) && state === 'open' && !submitted;
  const fail = (e: unknown) => setFailure(liveErrorMessage(t, e));
  const save = (next: Record<string, string>) => {
    setFailure(null);
    data?.actions.setPlacements(question.id, next).catch(fail);
  };
  const submit = () => {
    setFailure(null);
    const go = async () => {
      if (question.type === 'ranking' && Object.keys(values).length === 0) {
        const order = defaultOrder(question, values);
        await data?.actions.setPlacements(
          question.id,
          Object.fromEntries(order.map((id, i) => [id, String(i + 1)])),
        );
      }
      await data?.actions.submitPlacements(question.id);
    };
    go().catch(fail);
  };
  return { state, values, submitted, interactive, save, submit, failure };
}

function RatingBody({
  question,
  values,
  disabled,
  onChange,
}: {
  question: RatingQuestion;
  values: Record<string, string>;
  disabled: boolean;
  onChange: (values: Record<string, string>) => void;
}) {
  if (question.type === 'scale') {
    return (
      <ScalePane question={question} values={values} disabled={disabled} onChange={onChange} />
    );
  }
  if (question.type === 'points') {
    return (
      <PointsPane question={question} values={values} disabled={disabled} onChange={onChange} />
    );
  }
  return (
    <RankingPane
      question={question}
      order={defaultOrder(question, values)}
      disabled={disabled}
      onChange={(order) => onChange(Object.fromEntries(order.map((id, i) => [id, String(i + 1)])))}
    />
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'min(56px, 9cqh)',
        opacity: 0.7,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}

function RatingFrame({
  question,
  language,
  ...rest
}: {
  question: RatingQuestion;
  language?: PollLanguage;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>) {
  const t = useLocale();
  const me = useRatingParticipant(question);
  const body = (ctx: FrameCtx): ReactNode => {
    if (ctx.mode === 'results' && ctx.data) {
      return (
        <div style={{ position: 'absolute', inset: 0 }}>
          <QuestionResults question={question} data={ctx.data} showMarks={ctx.showMarks} />
        </div>
      );
    }
    if (ctx.mode === 'collecting') return <Centered>{t.live.collectingAnswers}</Centered>;
    return (
      <div style={{ fontSize: slideFont, overflow: 'hidden', maxHeight: '100%' }}>
        <RatingBody
          question={question}
          values={ctx.mode === 'preview' ? {} : me.values}
          disabled={ctx.mode === 'preview' || !ctx.interactive}
          onChange={me.save}
        />
        {me.failure && <div style={{ fontSize: '0.7em', color: BAD }}>{me.failure}</div>}
      </div>
    );
  };
  const live = useLive();
  // A ranking submitted without moving anything still saves the order the participant saw.
  const saveDefaultOrder = async () => {
    if (question.type !== 'ranking' || Object.keys(me.values).length > 0) return;
    const order = defaultOrder(question, me.values);
    await live?.data.actions.setPlacements(
      question.id,
      Object.fromEntries(order.map((id, i) => [id, String(i + 1)])),
    );
  };
  return (
    <QuestionFrame
      {...rest}
      question={question}
      language={language}
      needsSubmit
      beforeSubmit={saveDefaultOrder}
    >
      {body}
    </QuestionFrame>
  );
}

export type ScaleProps = { question: ScaleQuestion; language?: PollLanguage } & Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
>;
export function Scale(props: ScaleProps) {
  return <RatingFrame {...props} />;
}

export type RankingProps = { question: RankingQuestion; language?: PollLanguage } & Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
>;
export function Ranking(props: RankingProps) {
  return <RatingFrame {...props} />;
}

export type PointsProps = { question: PointsQuestion; language?: PollLanguage } & Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
>;
export function Points(props: PointsProps) {
  return <RatingFrame {...props} />;
}

/** Shared by the slide component and the phone card for number and open-text answers. */
export function useTextParticipant(question: TextQuestion) {
  const live = useLive();
  const t = useLocale();
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const data = live?.data;
  const state = data?.states[question.id]?.state ?? 'locked';
  const mine = data?.mine[question.id];
  const send = (text: string) => {
    setFailure(null);
    setPending(true);
    data?.actions
      .submitTextAnswer(question.id, text)
      .catch((e: unknown) => setFailure(liveErrorMessage(t, e)))
      .finally(() => setPending(false));
  };
  const revealed =
    Boolean(mine?.show_results) && (data?.session?.mode === 'self' || state === 'ended');
  return { state, mine, send, pending, failure, revealed, score: data?.score };
}

function TextBody({ question, fontSize }: { question: TextQuestion; fontSize: string }) {
  const t = useLocale();
  const me = useTextParticipant(question);
  const maxLength = question.type === 'number' ? 24 : (question.maxLength ?? 500);
  if (me.mine) {
    return (
      <div style={{ fontSize, fontFamily: FONT, color: INK }}>
        {t.live.thanksForAnswer}
        <div style={{ opacity: 0.7, marginTop: '0.3em' }}>
          {t.live.youWrote}{' '}
          <strong>
            {me.mine.answer_text ?? me.mine.option_id}
            {question.type === 'number' && question.unit ? ` ${question.unit}` : ''}
          </strong>
        </div>
        {me.revealed && me.mine.is_correct !== null && (
          <div
            style={{ fontWeight: 700, color: me.mine.is_correct ? GOOD : BAD, marginTop: '0.4em' }}
          >
            {me.mine.is_correct ? t.live.correct : t.live.notQuite}
            {me.score && me.score.graded > 0 && (
              <span style={{ fontSize: '0.62em', color: INK, opacity: 0.7, marginLeft: '0.5em' }}>
                {format(t.live.score, { correct: me.score.correct, graded: me.score.graded })}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
  if (me.state !== 'open') {
    return (
      <div style={{ fontSize, opacity: 0.7 }}>
        {me.state === 'ended' ? t.live.answerPeriodEnded : t.live.waitingForHostToOpen}
      </div>
    );
  }
  return (
    <div style={{ fontSize }}>
      <TextEntry
        kind={question.type === 'number' ? 'number' : 'text'}
        maxLength={maxLength}
        disabled={me.pending}
        onSubmit={me.send}
        unit={question.type === 'number' ? question.unit : undefined}
      />
      {me.failure && <div style={{ fontSize: '0.7em', color: BAD }}>{me.failure}</div>}
    </div>
  );
}

function TextFrame({
  question,
  language,
  ...rest
}: {
  question: TextQuestion;
  language?: PollLanguage;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>) {
  const t = useLocale();
  return (
    <QuestionFrame {...rest} question={question} language={language}>
      {(ctx) => {
        if (ctx.mode === 'results' && ctx.data) {
          return (
            <div style={{ position: 'absolute', inset: 0 }}>
              <QuestionResults question={question} data={ctx.data} showMarks={ctx.showMarks} />
            </div>
          );
        }
        if (ctx.mode === 'collecting') return <Centered>{t.live.collectingAnswers}</Centered>;
        if (ctx.mode === 'preview') {
          return (
            <div style={{ fontSize: slideFont, pointerEvents: 'none' }}>
              <TextEntry
                kind={question.type === 'number' ? 'number' : 'text'}
                maxLength={20}
                disabled
                onSubmit={() => {}}
                unit={question.type === 'number' ? question.unit : undefined}
              />
            </div>
          );
        }
        return <TextBody question={question} fontSize={slideFont} />;
      }}
    </QuestionFrame>
  );
}

export type NumberAnswerProps = { question: NumberQuestion; language?: PollLanguage } & Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
>;
export function NumberAnswer(props: NumberAnswerProps) {
  return <TextFrame {...props} />;
}

export type OpenTextProps = { question: OpenTextQuestion; language?: PollLanguage } & Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
>;
export function OpenText(props: OpenTextProps) {
  return <TextFrame {...props} />;
}

export const isExtraQuestion = (q: InteractiveQuestion): q is RatingQuestion | TextQuestion =>
  q.type === 'scale' ||
  q.type === 'ranking' ||
  q.type === 'points' ||
  q.type === 'number' ||
  q.type === 'open_text';

/** The phone layout for these questions, where the slide itself is too small to use. */
export function ExtraQuestionCard({ question }: { question: RatingQuestion | TextQuestion }) {
  const t = useLocale();
  const rating = question.type === 'number' || question.type === 'open_text' ? null : question;
  const me = useRatingParticipantSafe(rating);
  if (!rating) return <TextBody question={question as TextQuestion} fontSize="18px" />;
  return (
    <section
      aria-label={question.question}
      style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT, color: INK }}
    >
      {me.state === 'locked' ? (
        <div style={{ opacity: 0.7, fontSize: 18, textAlign: 'center', padding: '24px 0' }}>
          {t.live.waitingForHostToOpen}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 18 }}>
            <RatingBody
              question={rating}
              values={me.values}
              disabled={!me.interactive}
              onChange={me.save}
            />
          </div>
          {me.interactive && (
            <button
              type="button"
              onClick={me.submit}
              style={{
                alignSelf: 'flex-start',
                padding: '14px 26px',
                fontSize: 20,
                fontFamily: FONT,
                fontWeight: 600,
                color: 'var(--osd-bg, #fff)',
                background: 'var(--osd-accent, #2563eb)',
                border: 0,
                borderRadius: 12,
              }}
            >
              {t.live.submitSorting}
            </button>
          )}
          {me.submitted && (
            <div style={{ fontSize: 20, opacity: 0.8 }}>✓ {t.live.submittedSorting}</div>
          )}
        </>
      )}
      {me.failure && <div style={{ fontSize: 16, color: BAD }}>{me.failure}</div>}
    </section>
  );
}

const emptyRating: ScaleQuestion = { id: '', type: 'scale', question: '', items: [] };

function useRatingParticipantSafe(question: RatingQuestion | null) {
  return useRatingParticipant(question ?? emptyRating);
}
