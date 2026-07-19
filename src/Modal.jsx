function Modal({ user, onClose }) {
  if (!user) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{`${user.firstName} ${user.lastName} ${user.maidenName}`}</h2>
          <button className="close-btn" type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="user-meta">
            <img className="avatar" src={user.image} alt={user.firstName} />
            <div className="meta-grid">
              <div className="meta-box">
                <strong>Возраст</strong>
                <span>{user.age}</span>
              </div>
              <div className="meta-box">
                <strong>Пол</strong>
                <span>{user.gender}</span>
              </div>
              <div className="meta-box">
                <strong>Телефон</strong>
                <span>{user.phone}</span>
              </div>
              <div className="meta-box">
                <strong>Email</strong>
                <span>{user.email}</span>
              </div>
            </div>
          </div>
          <div className="meta-grid">
            <div className="meta-box">
              <strong>Страна</strong>
              <span>{user.address?.country}</span>
            </div>
            <div className="meta-box">
              <strong>Город</strong>
              <span>{user.address?.city}</span>
            </div>
            <div className="meta-box">
              <strong>Улица</strong>
              <span>{user.address?.address}</span>
            </div>
            <div className="meta-box">
              <strong>Рост</strong>
              <span>{user.height} см</span>
            </div>
            <div className="meta-box">
              <strong>Вес</strong>
              <span>{user.weight} кг</span>
            </div>
            <div className="meta-box">
              <strong>Дата рождения</strong>
              <span>{user.birthDate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Modal;