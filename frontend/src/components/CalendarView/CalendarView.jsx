import { useState } from 'react';
import * as JapaneseHolidays from 'japanese-holidays';
import { Lunar } from 'lunar-javascript';
import { getMoonPhase, getSolarTerm } from '../../services/nature';
import './CalendarView.css';

export function CalendarView({ notes, events = [], onAddEvent, onDateSelect, selectedDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [promptState, setPromptState] = useState(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const handleToday = () => {
    setCurrentMonth(new Date());
    onDateSelect(null);
  };

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const notesByDate = {};
  notes.forEach(note => {
    const d = new Date(note.createdAt);
    const dateStr = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (!notesByDate[dateStr]) notesByDate[dateStr] = [];
    notesByDate[dateStr].push(note);
  });

  const today = new Date();
  const todayNature = getMoonPhase(today);
  const todayTerm = getSolarTerm(today);

  const handleAddEventClick = (date) => {
    setPromptState({ date, title: '', isAnnual: false, mediaBase64: null });
  };

  return (
    <div className="calendar-container">
      {/* 本日の自然情報バナー */}
      <div className="nature-today-panel glass-card">
        <div className="nature-icon-large">{todayNature.emoji}</div>
        <div className="nature-details">
          <span className="nature-term">二十四節気: {todayTerm}</span>
          <div className="nature-tide-info">
            {todayNature.name} (月齢 {todayNature.age}) / {todayNature.tide}
          </div>
        </div>
      </div>

      <div className="calendar-view glass-card">
        <div className="calendar-header">
          <button className="cal-btn" onClick={handlePrevMonth}>◀</button>
          <div className="cal-title">
            <span>{year}年 {month + 1}月</span>
            <button className="cal-today-btn" onClick={handleToday}>今日にもどる</button>
          </div>
          <button className="cal-btn" onClick={handleNextMonth}>▶</button>
        </div>

        <div className="calendar-grid">
          {['日', '月', '火', '水', '木', '金', '土'].map(d => (
            <div key={d} className="cal-day-header">{d}</div>
          ))}
          {days.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="cal-cell empty" />;
            
            const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            const isSelected = selectedDate && 
              selectedDate.getFullYear() === date.getFullYear() && 
              selectedDate.getMonth() === date.getMonth() && 
              selectedDate.getDate() === date.getDate();
            
            const isToday = today.toDateString() === date.toDateString();
            const dayNotes = notesByDate[dateStr] || [];
            const nature = getMoonPhase(date);
            const term = getSolarTerm(date);
            const holidayName = JapaneseHolidays.isHoliday(date);
            const lunarDate = Lunar.fromDate(date);
            const lunarMonth = lunarDate.getMonth();
            const lunarDay = lunarDate.getDay();

            const isSunday = date.getDay() === 0;
            const isSaturday = date.getDay() === 6;
            const isHoliday = !!holidayName;
            let dateColorClass = '';
            if (isSunday || isHoliday) dateColorClass = 'cal-text-holiday';
            else if (isSaturday) dateColorClass = 'cal-text-saturday';

            // 節気の変わる日の判別用の簡易な表示（当日が節気なら表示するなど）もできますが
            // ここではシンプルにツールチップへ収納します
            return (
              <div 
                key={idx} 
                className={`cal-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isHoliday ? 'holiday-bg' : ''}`}
                onClick={() => onDateSelect(date.toDateString() === (selectedDate?.toDateString() || '') ? null : date)}
                title={`旧暦: ${lunarMonth}月${lunarDay}日\n二十四節気: ${term}\n月齢: ${nature.age} (${nature.name})\n潮回り: ${nature.tide}${holidayName ? `\n祝日: ${holidayName}` : ''}`}
              >
                <div className="cal-date-top">
                  <div className="cal-date-left">
                    <div className={`cal-date-num ${dateColorClass}`}>{date.getDate()}</div>
                    <div className="cal-lunar-date">旧 {lunarMonth}/{lunarDay}</div>
                  </div>
                  <div className={`cal-tide-label tide-${nature.tide}`}>{nature.tide}</div>
                </div>
                {holidayName && <div className="cal-holiday-name">{holidayName}</div>}

                {(() => {
                  const mmdd = `${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
                  const yyyymmdd = `${date.getFullYear()}-${mmdd}`;
                  const dayEvents = events.filter(e => e.isAnnual ? e.date.endsWith(mmdd) : e.date === yyyymmdd);
                  
                  return dayEvents.length > 0 && (
                    <div className="cal-events-list">
                      {dayEvents.map(e => (
                        <div key={e.id} className="cal-event-item" style={{backgroundColor: e.color}}>
                          {e.isAnnual && '🎁 '}{e.title}
                          {e.mediaUrl && (
                            <div className="cal-event-media-thumb">
                              {e.mediaUrl.endsWith('.mp4') ? (
                                <video src={`http://localhost:3001${e.mediaUrl}`} muted loop playsInline style={{width:'100%', height:'auto', marginTop:'4px', borderRadius:'4px', pointerEvents:'none'}} />
                              ) : (
                                <img src={`http://localhost:3001${e.mediaUrl}`} alt="" style={{width:'100%', height:'auto', marginTop:'4px', borderRadius:'4px', pointerEvents:'none'}} />
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <button 
                  className="cal-add-event-btn" 
                  title="予定を追加"
                  onClick={(e) => { e.stopPropagation(); handleAddEventClick(date); }}
                >
                  +
                </button>

                <div className="cal-nature-info">
                  <span className="cal-moon">{nature.emoji}</span>
                </div>
                {dayNotes.length > 0 && (
                  <div className="cal-dots">
                    {dayNotes.slice(0, 4).map((n, i) => (
                      <span key={i} className={`cal-dot ${n.emotion}`} title={n.emotion} />
                    ))}
                    {dayNotes.length > 4 && <span className="cal-dot-more">+</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {promptState && (
        <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.6)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div className="glass-card" style={{padding: '24px', width: '320px', background: 'var(--color-bg-deep)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)'}}>
            <h3 style={{margin: '0 0 16px 0', fontSize: '18px', color: 'var(--color-primary)'}}>
              {promptState.date.getMonth()+1}月{promptState.date.getDate()}日の予定
            </h3>
            <input 
              type="text" 
              autoFocus
              placeholder="タイトル (例: 友達の誕生日)" 
              value={promptState.title}
              onChange={e => setPromptState({...promptState, title: e.target.value})}
              style={{width: '100%', padding: '10px', marginBottom: '16px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none'}}
            />
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '13px', color: 'var(--color-text-muted)', cursor: 'pointer'}}>
              <input 
                type="checkbox" 
                checked={promptState.isAnnual} 
                onChange={e => setPromptState({...promptState, isAnnual: e.target.checked})} 
                style={{accentColor: 'var(--color-primary)'}}
              />
              毎年繰り返す（記念日・誕生日など）
            </label>
            <div style={{marginBottom: '20px'}}>
              <label style={{fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px'}}>
                写真や動画を追加（オプション）:
              </label>
              <input 
                type="file" 
                accept="image/*,video/*"
                onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = r => setPromptState({...promptState, mediaBase64: r.target.result});
                    reader.readAsDataURL(file);
                  }
                }}
                style={{fontSize: '12px', color: 'var(--color-primary)', width: '100%'}}
              />
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
              <button 
                onClick={() => setPromptState(null)}
                style={{background: 'transparent', border:'1px solid var(--color-border)', padding: '6px 16px', borderRadius: '6px', cursor:'pointer', color:'var(--color-text)'}}
              >
                キャンセル
              </button>
              <button 
                disabled={!promptState.title.trim()}
                onClick={() => {
                  if(!promptState.title.trim()) return;
                  const mmdd = `${String(promptState.date.getMonth()+1).padStart(2,'0')}-${String(promptState.date.getDate()).padStart(2,'0')}`;
                  const yyyymmdd = `${promptState.date.getFullYear()}-${mmdd}`;
                  onAddEvent({
                    title: promptState.title,
                    date: yyyymmdd,
                    isAnnual: promptState.isAnnual,
                    mediaBase64: promptState.mediaBase64,
                    color: promptState.isAnnual ? 'rgba(240, 160, 96, 0.8)' : 'rgba(78, 205, 196, 0.8)'
                  });
                  setPromptState(null);
                }}
                style={{background: 'var(--color-primary)', border:'none', padding: '6px 16px', borderRadius: '6px', cursor:'pointer', color:'white', opacity: promptState.title.trim() ? 1 : 0.5}}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
