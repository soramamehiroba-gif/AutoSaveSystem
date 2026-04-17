/**
 * オートセーブシステム.js
 * 名前未定（仮）様の「セーブ強化.js」に手を加えたものです
 */

var SaveTitle_Chapter = "Chapter Save";
var SaveTitle_Map = "Map Save";
var SaveTitle_Auto = "Auto Save";

var FileNoHoseiY             = -12;				// Fileno Y座標補正

// セーブ情報：章セーブ/マップセーブファイルの設定項目
var FileSaveTypeHoseiX       = 80;				// 章セーブ/マップセーブ X座標補正
var FileSaveTypeHoseiY       = -12;				// 章セーブ/マップセーブ Y座標補正

// セーブ情報：章番号と章の名前の設定項目
var ChapterNumberHoseiY      = 4;				// 章番号 Y座標補正
var ChapterNameHoseiY        = 4;				// 章の名前 Y座標補正

// セーブ情報：NoData表示の設定項目
var NoDataHoseiX             = 80;				// NoData表示 X座標補正
var NoDataHoseiY             = 4;				// NoData表示 Y座標補正

// 以下プログラム
(function () {

// ロード画面描画
var alias00 = LoadSaveScreen.drawScreenCycle;

/**
 * [override] ロード画面の中央位置を算出し、必要に応じてロード種別選択ウィンドウを先に描画したうえで、
 * 元のロード画面描画処理を実行するメソッドです。
 * @param {number} x 描画開始位置のX座標として内部計算に使用されます
 * @param {number} y 描画開始位置のY座標として内部計算に使用されます
 */
LoadSaveScreen.drawScreenCycle = function() {
    var x, y;
    
    x = LayoutControl.getCenterX(-1, this._scrollbar.getScrollbarWidth());
    y = LayoutControl.getCenterY(-1, this._scrollbar.getScrollbarHeight());
    
    // セーブタイトルウィンドウ描画（章セーブ、MAPセーブの切替用ウィンドウ）
    if( this._loadsaveTitleWindow != null ) {
        y -= this._loadsaveTitleWindow.getWindowHeight();	// セーブタイトルウィンドウの高さ分、上にずらして描画
        this._loadsaveTitleWindow.drawWindow(x, y);
    }
    
    alias00.call(this);
}

/**
 * [override] 選択中のセーブファイルをロード可能か判定し、必要な補正処理や外部連携処理を
 * 行ったうえでロードを実行し、最後にロード位置情報を更新するメソッドです。
 */
LoadSaveScreen._executeLoad = function() {
    var object = this._scrollbar.getObject();
    var index  = this._scrollbar.getIndex();

    this._applyWalkControlIfNeeded(object);

    if (!this._isLoadable(object)) {
        return;
    }

    SceneManager.setEffectAllRange(true);
    index = this._convertIndexBySaveMode(index);

    root.getLoadSaveManager().loadFile(index);

    SaveSlotControl.updateSaveIndexByLoadIndex(
        this._scrollbar.getIndex(),
        this._SaveMode
    );
};

/**
 * [new] WalkControl が導入されている場合に、ロード対象ファイルへ保存されている
 * 歩行制御データを更新して反映するためのメソッドです。
 * @param {object} object ロード対象となるセーブファイル情報オブジェクトです
 */
LoadSaveScreen._applyWalkControlIfNeeded = function(object) {
    if (typeof WalkControl === 'undefined') {
        return;
    }

    var walkData = object.custom.walkControlObject_;
    if (typeof walkData !== 'undefined') {
        WalkControl.updateDataObject(walkData, object);
    }
};

/**
 * [new] セーブファイルが完全なデータを保持しているか、またはマップ情報を含んでいるかを確認し、
 * ロード可能かどうかを判定するメソッドです。
 * @param {object} object ロード対象となるセーブファイル情報オブジェクトです
 * @return {boolean} ロード可能であればtrue、そうでなければfalseを返します
 */
LoadSaveScreen._isLoadable = function(object) {
    return object.isCompleteFile() || object.getMapInfo() !== null;
};

/**
 * [new] 現在のセーブ種別（章/マップ）に応じて、ロード対象となるファイル番号を
 * 正しいインデックスへ補正するメソッドです。
 * @param {number} index 現在選択されているセーブファイルのインデックス番号です
 * @return {number} 補正後のセーブファイルインデックス番号です
 */
LoadSaveScreen._convertIndexBySaveMode = function(index) {
    if (this._SaveMode === ExtendSaveMode.CHAPTER) {
        return SaveSlotRange.CHAPTER.start + index;
    }
    else if (this._SaveMode === ExtendSaveMode.MAP) {
        return SaveSlotRange.MAP.start + index;
    }
    else if (this._SaveMode === ExtendSaveMode.AUTO) {
        return SaveSlotRange.AUTO.start + index;
    }

    return index;
};

var alias03 = LoadSaveScreen._completeScreenMemberData;

/**
 * [override] ロード画面の初期化時に前回使用したセーブ種別を取得して内部状態へ反映し、
 * 元の初期化処理を実行したうえでロード種別選択ウィンドウを生成・設定するメソッドです。
 * @param {object} screenParam 画面初期化に必要なパラメータを保持するオブジェクトです
 */
LoadSaveScreen._completeScreenMemberData = function(screenParam) {
    // マップセーブか章セーブかを読み込んで保持
    this._SaveMode = SaveSlotControl.getSaveMode();
    
    alias03.call(this, screenParam);
    
    this._loadsaveTitleWindow = createWindowObject(LoadSaveTitleWindow);
    this._loadsaveTitleWindow.setData();
    this._loadsaveTitleWindow.setIndex(this._SaveMode);
    this._loadsaveTitleWindow.setActive(false);
    this._loadSelectMode = LoadSelectMode.LOADFILE;
}

/**
 * [override] 現在のセーブ種別（章/マップ）に応じて登録対象となるセーブファイル範囲を切り替え、
 * スクロールバーへセーブファイル情報を設定して一覧を構築するメソッドです。
 * @param {number} count 利用可能なセーブファイル総数です
 * @param {boolean} isLoadMode ロードモードとして動作するかどうかを示す真偽値です
 */
LoadSaveScreen._setScrollData = function(count, isLoadMode) {
    var i;
    var manager = root.getLoadSaveManager();
    var start = 0;
    var end = 0;

    // --- CHAPTER ---
    if (this._SaveMode === ExtendSaveMode.CHAPTER) {
        start = SaveSlotRange.CHAPTER.start;
        end   = SaveSlotRange.CHAPTER.start + SaveSlotRange.CHAPTER.count;
    }
    // --- MAP ---
    else if (this._SaveMode === ExtendSaveMode.MAP) {
        start = SaveSlotRange.MAP.start;
        end   = SaveSlotRange.MAP.start + SaveSlotRange.MAP.count;
    }
    // --- AUTO ---
    else if (this._SaveMode === ExtendSaveMode.AUTO) {
        start = SaveSlotRange.AUTO.start;
        end   = SaveSlotRange.AUTO.start + SaveSlotRange.AUTO.count;
    }

    this._scrollbar.resetScrollData();

    for (i = start; i < end; i++) {
        this._scrollbar.objectSet(manager.getSaveFileInfo(i));
    }

    this._scrollbar.objectSetEnd();
    this._scrollbar.setLoadMode(isLoadMode);
};

/**
 * [override] 現在のセーブ種別（章/マップ/オート）に応じて
 * 前回使用したファイル番号を取得し、
 * スクロールバーのカーソル位置を設定するメソッドです。
 */
LoadSaveScreen._setDefaultSaveFileIndex = function() {
    this._setDefaultSaveFileIndexBySaveMode(this._SaveMode);
};

/**
 * [new] セーブ種別に応じて記録されている前回使用ファイル番号を取得し、
 * スクロールバーのカーソル位置をそのインデックスへ合わせるためのメソッドです。
 * @param {number} mode ExtendSaveMode のいずれか（CHAPTER / MAP / AUTO）
 */
LoadSaveScreen._setDefaultSaveFileIndexBySaveMode = function(mode) {
    var absIndex = SaveSlotControl.getSaveIndex(mode);  // 絶対インデックス
    var uiIndex = 0;

    // --- 絶対インデックス → UI インデックスへ変換 ---
    if (mode === ExtendSaveMode.CHAPTER) {
        uiIndex = absIndex - SaveSlotRange.CHAPTER.start;
    }
    else if (mode === ExtendSaveMode.MAP) {
        uiIndex = absIndex - SaveSlotRange.MAP.start;
    }
    else if (mode === ExtendSaveMode.AUTO) {
        uiIndex = absIndex - SaveSlotRange.AUTO.start;
    }

    // 範囲外なら 0 に補正（保険）
    if (uiIndex < 0) uiIndex = 0;

    // スクロールバーの範囲内ならカーソルをセット
    if (this._scrollbar.getObjectCount() > uiIndex) {
        this._scrollbar.setIndex(uiIndex);
    }
};

/**
 * [override] ロード画面における入力処理を行い、
 * ロード対象の選択モードとロード種別選択モードを切り替えながら適切な処理を進めるメソッドです。
 * @return {number} 入力結果としてのMoveResult値です
 */
LoadSaveScreen._moveLoad = function() {
    if (this.getCycleMode() !== LoadSaveMode.TOP) {
        return MoveResult.CONTINUE;
    }

    return (this._loadSelectMode === LoadSelectMode.LOADFILE)
        ? this._moveLoadFileSelect()
        : this._moveLoadTypeSelect();
};

LoadSaveScreen._moveLoadFileSelect = function() {
    var input = this._scrollbar.moveInput();

    if (input === ScrollbarInput.SELECT) {
        this._executeLoad();
        return MoveResult.CONTINUE;
    }

    if (input === ScrollbarInput.CANCEL) {
        this._switchToLoadTypeSelect();
        return MoveResult.CONTINUE;
    }

    this._checkSaveFile();
    return MoveResult.CONTINUE;
};

LoadSaveScreen._moveLoadTypeSelect = function() {
    var result = this._loadsaveTitleWindow.moveWindow();

    if (result === MoveResult.END) {
        return MoveResult.END;
    }

    if (result === MoveResult.SELECT) {
        this._applySelectedLoadType();
        return MoveResult.CONTINUE;
    }

    return MoveResult.CONTINUE;
};

LoadSaveScreen._switchToLoadTypeSelect = function() {
    this._loadsaveTitleWindow.enableSelectCursor(true);
    this._scrollbar.enableSelectCursor(false);
    this._loadSelectMode = LoadSelectMode.LOADTYPE;
};

LoadSaveScreen._applySelectedLoadType = function() {
    var saveMode = this._loadsaveTitleWindow.getIndex();  // 0=CHAPTER,1=MAP,2=AUTO

    // モードが変わったらスクロールデータを再構築
    if (this._SaveMode !== saveMode) {
        this._SaveMode = saveMode;

        // 3 モード対応のスロット構築
        this._setScrollData(
            DefineControl.getMaxSaveFileCount(),
            this._isLoadMode
        );
    }

    // 3 モード対応のカーソル復元
    this._setDefaultSaveFileIndex();

    // UI のカーソル制御
    this._loadsaveTitleWindow.enableSelectCursor(false);
    this._scrollbar.enableSelectCursor(true);

    // ロードファイル選択モードへ移行
    this._loadSelectMode = LoadSelectMode.LOADFILE;
};

/**
 * [override] 現在のセーブ種別（章/マップ/オート）に応じて、
 * セーブ画面タイトルとして表示するテキストを返すメソッドです。
 * @return {string} 章/マップ/オートのタイトル文字列です
 */
DataSaveScreenEx.getScreenTitleName = function() {
    var mode = this._saveMode;  // DataSaveScreenEx._completeScreenMemberData で設定される

    if (mode === ExtendSaveMode.CHAPTER) {
        return SaveTitle_Chapter;
    }
    else if (mode === ExtendSaveMode.MAP) {
        return SaveTitle_Map;
    }
    else if (mode === ExtendSaveMode.AUTO) {
        return SaveTitle_Auto;
    }

    // 想定外（保険）
    return SaveTitle_Chapter;
};


var alias20 = DataSaveScreenEx._completeScreenMemberData;

/**
 * [override] セーブ画面の構築完了時に、現在のセーブ種別（章/マップ/オート）を取得し、
 * スクロールバーへ反映したうえで従来の初期化処理を実行するメソッドです。
 */
DataSaveScreenEx._completeScreenMemberData = function(screenParam) {
    // 現在のセーブモード（CHAPTER / MAP / AUTO）を取得
    this._saveMode = ExtendSaveMode.CHAPTER;

    if( root.getBaseScene() !== SceneType.REST && root.getCurrentSession().getTurnCount() > 0 ) {
        this._saveMode = ExtendSaveMode.MAP;
    }

    // スクロールバーにセーブモードをセット
    if (this._scrollbar.setSaveMode) {
        this._scrollbar.setSaveMode(this._saveMode);
    }

    // 従来処理の呼び出し
    alias20.call(this, screenParam);

    // セーブ画面ではタイトルウィンドウを使用しない
    this._loadsaveTitleWindow = null;
};

/**
 * [override] セーブファイル一覧を生成するためにスクロールバーへ必要なデータを設定するメソッドです。
 * @param {number} count セーブファイル数を示す値です
 * @param {boolean} isLoadMode ロードモードで動作しているかどうかを示す真偽値です
 */
DataSaveScreenEx._setScrollData = function(count, isLoadMode) {
    // DataSaveScreen._setScrollData()を実行
    DataSaveScreen._setScrollData.call(this, count, isLoadMode);
}

/**
 * [override] 前回使用したセーブ種別に応じて、デフォルトで選択される
 * セーブファイルのカーソル位置を設定するメソッドです。
 * @param {boolean} this._isMapSave マップセーブとして扱うかどうかを示す内部フラグです
 */
DataSaveScreenEx._setDefaultSaveFileIndex = function() {
    this._setDefaultSaveFileIndexBySaveMode(this._saveMode);
}

/**
 * [override] セーブ画面で使用するスクロールバーオブジェクトを取得するためのメソッドです。
 * @return {object} SaveScrollbarExtendEx クラスオブジェクトを返します
 */
// スクロールバーオブジェクトの取得
DataSaveScreenEx._getScrollbarObject = function() {
    return SaveScrollbarExtendEx;
}

/**
 * [override] セーブ処理を実行し、保存対象データの更新後に詳細ウィンドウへ
 * 最新のセーブ情報を反映するメソッドです。
 */
DataSaveScreenEx._executeSave = function() {
    // DataSaveScreen._setScrollData()を実行
    DataSaveScreen._executeSave.call(this);
    
    // 元の処理
	// LoadSaveScreen._executeSave.call(this);
    
    this._saveFileDetailWindow.setSaveFileInfo(this._scrollbar.getObject());
}

var alias30 = LoadSaveScreenEx.drawScreenCycle;

/**
 * [override] ロード／セーブ画面の描画処理を拡張し、
 * タイトルウィンドウを含めた画面レイアウトを調整して描画するメソッドです。
 */
LoadSaveScreenEx.drawScreenCycle = function() {
    var width = this._scrollbar.getObjectWidth() + this._saveFileDetailWindow.getWindowWidth();
    var x = LayoutControl.getCenterX(-1, width);
    var y = LayoutControl.getCenterY(-1, this._scrollbar.getScrollbarHeight());
    
    // セーブタイトルウィンドウ描画（章セーブ、MAPセーブの切替用ウィンドウ）
    if( this._loadsaveTitleWindow != null ) {
        y -= this._loadsaveTitleWindow.getWindowHeight();	// セーブタイトルウィンドウの高さ分、上にずらして描画
        this._loadsaveTitleWindow.drawWindow(x, y);
    }
    
    alias30.call(this);
}

/**
 * [new] 現在のセーブ種別（章/マップ/オート）に応じて、
 * セーブ画面タイトルとして表示する文字列を返すメソッドです。
 * @return {string} 章/マップ/オートのタイトル文字列です
 */
DataSaveScreen.getScreenTitleName = function() {
    var mode = this._saveMode;
    var saveTitle = SaveTitle_Chapter;

    if (mode === ExtendSaveMode.CHAPTER) {
        saveTitle = SaveTitle_Chapter;
    }
    else if (mode === ExtendSaveMode.MAP) {
        saveTitle = SaveTitle_Map;
    }
    else if (mode === ExtendSaveMode.AUTO) {
        saveTitle = SaveTitle_Auto;
    }

    return saveTitle;
};

var alias10 =  DataSaveScreen._completeScreenMemberData;

/**
 * [override] 現在のセーブ種別（章/マップ/オート）を SaveSlotControl から取得し、
 * スクロールバーへ反映したうえで画面構築処理を完了させるメソッドです。
 */
DataSaveScreen._completeScreenMemberData = function(screenParam) {
    // 現在のセーブモード（CHAPTER / MAP / AUTO）を取得
    this._saveMode = SaveSlotControl.getSaveMode();

    // スクロールバーにセーブモードをセット
    // （スクロールバー側で CHAPTER/MAP/AUTO の範囲を切り替える）
    if (this._scrollbar.setSaveMode) {
        this._scrollbar.setSaveMode(this._saveMode);
    }

    // 従来処理の呼び出し
    alias10.call(this, screenParam);

    // セーブ画面ではタイトルウィンドウを使用しない
    this._loadsaveTitleWindow = null;
};

/**
 * [override] 現在のセーブ種別（章/マップ/オート）に応じて、
 * スクロールバーへ登録するセーブファイル範囲を切り替え、
 * セーブ一覧を構築するメソッドです。
 */
DataSaveScreen._setScrollData = function(count, isLoadMode) {
    var i;
    var manager = root.getLoadSaveManager();
    var start = 0;
    var end = 0;

    // --- CHAPTER ---
    if (this._saveMode === ExtendSaveMode.CHAPTER) {
        start = SaveSlotRange.CHAPTER.start;
        end   = SaveSlotRange.CHAPTER.start + SaveSlotRange.CHAPTER.count;
    }
    // --- MAP ---
    else if (this._saveMode === ExtendSaveMode.MAP) {
        start = SaveSlotRange.MAP.start;
        end   = SaveSlotRange.MAP.start + SaveSlotRange.MAP.count;
    }
    // --- AUTO ---
    else if (this._saveMode === ExtendSaveMode.AUTO) {
        start = SaveSlotRange.AUTO.start;
        end   = SaveSlotRange.AUTO.start + SaveSlotRange.AUTO.count;
    }

    this._scrollbar.resetScrollData();

    for (i = start; i < end; i++) {
        this._scrollbar.objectSet(manager.getSaveFileInfo(i));
    }

    this._scrollbar.objectSetEnd();
    this._scrollbar.setLoadMode(isLoadMode);
};

/**
 * [override] 前回使用したセーブ種別に応じて、デフォルトで選択される
 * セーブファイルのカーソル位置を設定するメソッドです。
 * @param {boolean} this._saveMode マップセーブとして扱うかどうかを示す内部フラグです
 */
DataSaveScreen._setDefaultSaveFileIndex = function() {
    this._setDefaultSaveFileIndexBySaveMode(this._saveMode);
}

/**
 * [override] セーブ画面で使用するスクロールバーオブジェクトを取得し、
 * 拡張版スクロールバーを返すメソッドです。
 * @return {object} SaveScrollbarExtend セーブ画面用に拡張されたスクロールバーオブジェクトです
 */
DataSaveScreen._getScrollbarObject = function() {
    return SaveScrollbarExtend;
}

/**
 * [override] セーブ処理を実行し、現在のセーブ種別に応じて正しいファイル番号を算出したうえで
 * セーブマネージャに保存要求を送るメソッドです。
 */
DataSaveScreen._executeSave = function() {
    var uiIndex = this._scrollbar.getIndex();
    var mode = this._saveMode;  // CHAPTER / MAP / AUTO
    var fileno;

    // --- UI index → 絶対 index ---
    if (mode === ExtendSaveMode.CHAPTER) {
        fileno = SaveSlotRange.CHAPTER.start + uiIndex;
    }
    else if (mode === ExtendSaveMode.MAP) {
        fileno = SaveSlotRange.MAP.start + uiIndex;
    }
    else if (mode === ExtendSaveMode.AUTO) {
        fileno = SaveSlotRange.AUTO.start + uiIndex;
    }

    // --- obj を取得 ---
    var obj = this._getCustomObject();
    if (!obj) obj = {};

    // --- saveMode を書き込む（最重要） ---
    obj.saveMode = mode;

    // --- 最後に使ったスロットを記録 ---
    SaveSlotControl.setSaveIndex(mode, fileno);

    // --- セーブ実行 ---
    root.getLoadSaveManager().saveFile(
        fileno,
        this._screenParam.scene,
        this._screenParam.mapId,
        obj
    );
};

/**
 * [override] セーブスロットの主要情報を描画し、
 * ファイル番号・セーブ種別・章情報・プレイ時間・ターン数・難易度などを
 * 指定位置にまとめて表示するメソッドです。
 * @param {number} x 描画開始位置のX座標です
 * @param {number} y 描画開始位置のY座標です
 * @param {object} object セーブデータ情報を保持するオブジェクトです
 * @param {number} index 描画対象となるファイル番号のインデックスです
 */
LoadSaveScrollbar._drawMain = function(x, y, object, index) {
    this._drawFileNo(x, y+FileNoHoseiY, index);										// ファイルNoの描画
    
    this._drawFileSaveType(x+FileSaveTypeHoseiX, y+FileSaveTypeHoseiY, object);	// 章セーブ/マップセーブの描画
    
    // 他は表示座標以外従来と同じ
    this._drawChapterNumber(x, y+ChapterNumberHoseiY, object);
    this._drawChapterName(x, y+ChapterNumberHoseiY, object);
    this._drawPlayTime(x, y, object);
    this._drawTurnNo(x, y, object);
    this._drawDifficulty(x, y, object);
}

/**
 * [new] 指定された位置にファイル番号を描画し、セーブ一覧における各スロットの番号表示を行うメソッドです。
 * @param {number} xBase 描画開始位置のX座標です
 * @param {number} yBase 描画開始位置のY座標です
 * @param {number} index 描画対象となるファイル番号のインデックスです
 */
LoadSaveScrollbar._drawFileNo = function(xBase, yBase, index) {
    var length = this._getTextLength();
    var textui = this._getWindowTextUI();
    var color = textui.getColor();
    var font = textui.getFont();
    var x = xBase;
    var y = yBase;
    
    TextRenderer.drawKeywordText(x, y, StringTable.LoadSave_SaveFileMark + (index + 1), length, color, font);
}

/**
 * [override] 空のセーブスロットに対して、指定位置へ「No Data」表示とファイル番号を描画するメソッドです。
 * @param {number} xBase 描画開始位置のX座標です
 * @param {number} yBase 描画開始位置のY座標です
 * @param {number} index 描画対象となるファイル番号のインデックスです
 */
LoadSaveScrollbar._drawEmptyFile = function(xBase, yBase, index) {
    var length = this._getTextLength();
    var textui = this._getWindowTextUI();
    var color = textui.getColor();
    var font = textui.getFont();
    var x = xBase;
    var y = yBase;
    
    if (this._getTitleTextUI().getUIImage() === null) {
        // ファイルNoの描画
        this._drawFileNo(x, y+FileNoHoseiY, index);
        
        x += NoDataHoseiX;
        TextRenderer.drawKeywordText(x, y+NoDataHoseiY, StringTable.LoadSave_NoData, -1, ColorValue.KEYWORD, font);
    }
    else {
        x += 70;
        y += 10;
        TextRenderer.drawKeywordText(x, y, StringTable.LoadSave_NoData, -1, ColorValue.KEYWORD, font);
    }
}

/**
 * [new] セーブ種別（章/マップ/オート）に応じて、
 * 指定位置へ対応するセーブ種別名を色付きで描画するメソッドです。
 */
LoadSaveScrollbar._drawFileSaveType = function(xBase, yBase, object) {
    var textui = this._getWindowTextUI();
    var font = textui.getFont();
    var x = xBase;
    var y = yBase;
    var text = "";
    var color = 0xffffff;

    if (object != null && object.custom != null) {
        var mode = object.custom.saveMode;

        if (mode === ExtendSaveMode.CHAPTER) {
            text = SaveTitle_Chapter;
            color = 0x80ffff;
        }
        else if (mode === ExtendSaveMode.MAP) {
            text = SaveTitle_Map;
            color = 0x80ff80;
        }
        else if (mode === ExtendSaveMode.AUTO) {
            text = SaveTitle_Auto;
            color = 0xffd080;
        }
    }

    TextRenderer.drawKeywordText(x, y, text, -1, color, font);
};

var __getMaxSaveFileCount = DefineControl.getMaxSaveFileCount;

/**
 * [override] セーブファイルの最大保存数を設定値に基づいて決定するメソッドです。
 * ゲーム全体で使用される最大セーブ数として返します。
 *
 * @return {number} 補正後の最大セーブファイル数です
 */
DefineControl.getMaxSaveFileCount = function() {
    return SaveSlotRange.getSaveSlotCount();
};

var __prepareTurnMemberData = PlayerTurn._prepareTurnMemberData;

/**
 * [override] ターン開始時のメンバー初期化処理に、
 * オートセーブ（標準セーブスロット）を追加します。
 *
 * @return {void}
 */
PlayerTurn._prepareTurnMemberData = function () {
    __prepareTurnMemberData.apply(this, arguments);

    // --- 追加: マップ中でなければセーブしない ---
    if (root.getCurrentScene() !== SceneType.FREE) {
        return;
    }

    // --- オートセーブ処理 ---
    var mode = ExtendSaveMode.AUTO;
    var index = SaveSlotRange.incrementIndex(mode, SaveSlotControl.getSaveIndex(mode));
    var step = SceneType.FREE;
    var mapId = root.getCurrentSession().getCurrentMapInfo().getId();
    var obj = {saveMode: mode};

    SaveSlotControl.setSaveIndex(mode, index);

    root.getLoadSaveManager().saveFile(index, step, mapId, obj);
};

})();

var ExtendSaveMode = {
    CHAPTER: 0,
    MAP: 1,
    AUTO: 2
};

var LoadSelectMode = {
    LOADFILE: 0,            // ロードファイルの選択（従来の部分）
    LOADTYPE: 1             // ロード種類（章／マップの切替）
};

var SaveSlotRange = {
  CHAPTER: {start: 0, count: 20},
  MAP: {start: 20, count: 30},
  AUTO: {start: 50, count: 10},

  getSaveSlotCount: function() {
    return this.CHAPTER.count + this.MAP.count + this.AUTO.count;
  },

  getRange: function(type) {
    var obj = this[type];
    return {
      start: obj.start,
      end: obj.start + obj.count
    };
  },

  incrementIndex: function(mode, index) {
    var resultIndex = 0;

    if (mode === ExtendSaveMode.CHAPTER) {
      resultIndex = this.CHAPTER.start + ((index + 1) % this.CHAPTER.count);
    }
    else if (mode === ExtendSaveMode.MAP) {
      resultIndex = this.MAP.start + ((index + 1) % this.MAP.count);
    }
    else if (mode === ExtendSaveMode.AUTO) {
      resultIndex = this.AUTO.start + ((index + 1) % this.AUTO.count);
    }

    return resultIndex;
  }
};

/**
 * @classdesc
 * セーブ一覧のスクロールバー表示を拡張し、
 * 章/マップ/オートのセーブ種別に応じた描画処理を行うクラスです。
 */
var SaveScrollbarExtend = defineObject(LoadSaveScrollbar, {

    /** 現在のセーブモード（CHAPTER / MAP / AUTO） */
    _saveMode: ExtendSaveMode.CHAPTER,

    /**
     * このスクロールバーが扱うセーブモードを設定するメソッドです。
     * @param {number} mode ExtendSaveMode のいずれか
     */
    setSaveMode: function(mode) {
        this._saveMode = mode;
    },

    /**
     * 指定された位置にファイル番号を描画するメソッドです。
     * @param {number} xBase 描画開始位置のX座標
     * @param {number} yBase 描画開始位置のY座標
     * @param {number} index UI 上のインデックス（0〜）
     */
    _drawFileNo: function(xBase, yBase, index) {
        var absIndex;

        // --- UI index → 絶対 index へ変換 ---
        if (this._saveMode === ExtendSaveMode.CHAPTER) {
            absIndex = SaveSlotRange.CHAPTER.start + index;
        }
        else if (this._saveMode === ExtendSaveMode.MAP) {
            absIndex = SaveSlotRange.MAP.start + index;
        }
        else if (this._saveMode === ExtendSaveMode.AUTO) {
            absIndex = SaveSlotRange.AUTO.start + index;
        }

        // 絶対 index を描画（LoadSaveScrollbar の標準描画を利用）
        this._drawFileNoCommon(xBase, yBase, absIndex);
    },

    /**
     * LoadSaveScrollbar の _drawFileNo を呼び出す共通処理
     */
    _drawFileNoCommon: function(xBase, yBase, absIndex) {
        LoadSaveScrollbar._drawFileNo.call(this, xBase, yBase, absIndex);
    }
});

/**
 * @classdesc
 * セーブ画面で使用するスクロールバーを拡張し、
 * 章/マップ/オートのセーブ種別に応じた描画処理を追加するクラスです。
 */
var SaveScrollbarExtendEx = defineObject(LoadSaveScrollbarEx, {

    /** 現在のセーブモード（CHAPTER / MAP / AUTO） */
    _saveMode: ExtendSaveMode.CHAPTER,

    /**
     * このスクロールバーが扱うセーブモードを設定するメソッドです。
     * @param {number} mode ExtendSaveMode のいずれか
     */
    setSaveMode: function(mode) {
        this._saveMode = mode;
    },

    /**
     * 指定された位置にファイル番号を描画するメソッドです。
     * @param {number} xBase 描画開始位置のX座標
     * @param {number} yBase 描画開始位置のY座標
     * @param {number} index UI 上のインデックス（0〜）
     */
    _drawFileNo: function(xBase, yBase, index) {
        var absIndex;

        // --- UI index → 絶対 index へ変換 ---
        if (this._saveMode === ExtendSaveMode.CHAPTER) {
            absIndex = SaveSlotRange.CHAPTER.start + index;
        }
        else if (this._saveMode === ExtendSaveMode.MAP) {
            absIndex = SaveSlotRange.MAP.start + index;
        }
        else if (this._saveMode === ExtendSaveMode.AUTO) {
            absIndex = SaveSlotRange.AUTO.start + index;
        }

        // LoadSaveScrollbarEx の標準描画を利用
        LoadSaveScrollbarEx._drawFileNo.call(this, xBase, yBase, absIndex);
    }
    
});

/**
 * @classdesc
 * ロード/セーブ画面のタイトル項目をスクロール表示し、選択状態に応じた描画を行うためのクラスです。
 */
var LoadSaveTitleScrollbar = defineObject(BaseScrollbar,
{
    drawCursor: function(x, y, isActive) {
        if (this._isActive === false) {
            return;
        }
        BaseScrollbar.drawCursor.call(this, x, y, isActive);
    },

    drawScrollContent: function(x, y, object, isSelect, index) {
        var textui = this.getParentTextUI();
        var color = ColorValue.DEFAULT;
        var font = textui.getFont();
        var text = object;
        var centerY = Math.floor((this.getParentInstance().getWindowHeight() / 2) - (font.getSize() / 2));

        y -= ContentLayout.KEYWORD_HEIGHT;

        if (!isSelect) {
            color = ColorValue.DISABLE;
        }
        TextRenderer.drawKeywordText(x, y + centerY, text, -1, color, font);
    },

    drawDescriptionLine: function(x, y) {
    },

    getObjectWidth: function() {
        return 100;
    },

    getObjectHeight: function() {
        return 32;
    }
});

/**
 * @classdesc
 * セーブ種別を選択するためのタイトル表示ウィンドウを管理し、
 * スクロールバーによる選択操作と描画を行うクラスです。
 */
var LoadSaveTitleWindow = defineObject(BaseWindow,
{
    _scrollbar: null,

    /**
     * セーブ種別（章／マップ／オート）の項目をスクロールバーへ設定し、
     * 選択可能な状態を構築するメソッドです。
     */
    setData: function() {
        var arr = [
            SaveTitle_Chapter,
            SaveTitle_Map,
            SaveTitle_Auto
        ];

        this._scrollbar = createScrollbarObject(LoadSaveTitleScrollbar, this);
        this._scrollbar.setScrollFormation(3, 1);
        this._scrollbar.setObjectArray(arr);
    },

    enableSelectCursor: function(flag) {
        this._scrollbar.enableSelectCursor(flag);
    },

    setIndex: function(index) {
        this._scrollbar.setIndex(index);
    },

    getIndex: function() {
        return this._scrollbar.getIndex();
    },

    setActive: function(flag) {
        this._scrollbar.setActive(flag);
    },

    moveWindowContent: function() {
        var input = this._scrollbar.moveInput();
        var result = MoveResult.CONTINUE;

        if (input === ScrollbarInput.SELECT) {
            result = MoveResult.SELECT;
        }
        else if (input === ScrollbarInput.CANCEL) {
            result = MoveResult.END;
        }

        return result;
    },

    drawWindowContent: function(x, y) {
        y -= LoadSaveTitleWindow.getWindowYPadding();
        this._scrollbar.drawScrollbar(x, y);
    },

    getWindowWidth: function() {
        return this._scrollbar.getScrollbarWidth() + (this.getWindowXPadding() * 2);
    },

    getWindowHeight: function() {
        return this._scrollbar.getObjectHeight();
    }
});

/**
 * @classdesc
 * 章セーブとマップセーブのインデックス管理やセーブモードの保持・更新を行うための制御クラスです。
 */
var SaveSlotControl = {
    /**
     * セーブ関連の環境値を初期化し、章セーブとマップセーブのインデックスおよびセーブモードをリセットするメソッドです。
     */
    initialize: function() {
        root.getExternalData().env.ChapterSaveIndex = 0;
        root.getExternalData().env.MapSaveIndex = 0;
        root.getExternalData().env.AutoSaveIndex = 0;
        root.getExternalData().env.SaveMode = ExtendSaveMode.CHAPTER;
    },
    
    /**
     * 指定された種類のセーブに対応するインデックス位置を取得するメソッドです。
     * @param {boolean} isMapSave マップセーブかどうかを示す真偽値です
     * @return {number} 対応するセーブインデックス位置です
     */
    getSaveIndex: function(mode) {
        var index = 0;

        // --- CHAPTER セーブ ---
        if (mode === ExtendSaveMode.CHAPTER) {
            index = !isNaN(root.getExternalData().env.ChapterSaveIndex) ? root.getExternalData().env.ChapterSaveIndex : 0;
        }

        // --- MAP セーブ ---
        else if (mode === ExtendSaveMode.MAP) {
            index = !isNaN(root.getExternalData().env.MapSaveIndex) ? root.getExternalData().env.MapSaveIndex : 0;
        }

        // --- AUTO セーブ ---
        else if (mode === ExtendSaveMode.AUTO) {
            index = !isNaN(root.getExternalData().env.AutoSaveIndex) ? root.getExternalData().env.AutoSaveIndex : 0;
        }

        return index;
    },
    
    /**
     * 現在のセーブモード（章セーブまたはマップセーブ）を判定して取得するメソッドです。
     * @return {number} ExtendSaveMode のいずれかを示すセーブモード値です
     */
    getSaveMode: function() {
        var index;
        var saveMode = ExtendSaveMode.CHAPTER;		// 章セーブで初期化
        
        // env.SaveModeが存在すれば参照して章セーブ/マップセーブを判断する
        if( root.getExternalData().env.SaveMode != null ) {
            saveMode = root.getExternalData().env.SaveMode;
        }
        // env.SaveModeが存在しない場合は最後にセーブしたインデックスから章セーブ/マップセーブを判断する
        else {
            index = root.getExternalData().getActiveSaveFileIndex();
            
            // 最後にセーブしたインデックス≧章セーブのファイル数ならマップセーブ
            if ( index >= SaveSlotRange.AUTO.start ) {
                saveMode = ExtendSaveMode.AUTO;
            }
            else if ( index >= SaveSlotRange.MAP.start ) {
                saveMode = ExtendSaveMode.MAP;
            }
        }
        
        return saveMode;
    },
    
    /**
     * 現在のセーブモードを章セーブまたはマップセーブのいずれかに設定するメソッドです。
     * @param {number} mode ExtendSaveMode のいずれかを示すセーブモード値です
     */
    setSaveMode: function(mode) {
        root.getExternalData().env.SaveMode = mode;
    },
    
    /**
     * 指定された種類のセーブに対応するインデックス位置を更新し、同時にセーブモードも設定するメソッドです。
     * @param {boolean} isMapSave マップセーブかどうかを示す真偽値です
     * @param {number} index 設定するセーブインデックス位置です
     */
    setSaveIndex: function(mode, index) {
        if(root.getExternalData().env.MapSaveIndex === null || root.getExternalData().env.ChapterSaveIndex === null  || root.getExternalData().env.AutoSaveIndex == null) {
            this.initialize();
        }

        // --- CHAPTER セーブ ---
        if (mode === ExtendSaveMode.CHAPTER) {
            root.getExternalData().env.ChapterSaveIndex = index;
            this.setSaveMode(ExtendSaveMode.CHAPTER);
        }

        // --- MAP セーブ ---
        else if (mode === ExtendSaveMode.MAP) {
            root.getExternalData().env.MapSaveIndex = index;
            this.setSaveMode(ExtendSaveMode.MAP);
        }

        // --- AUTO セーブ ---
        else if (mode === ExtendSaveMode.AUTO) {
            root.getExternalData().env.AutoSaveIndex = index;
            this.setSaveMode(ExtendSaveMode.AUTO);
        }
        
    },
    
    /**
     * ロードしたファイルのインデックス位置に応じて章セーブまたはマップセーブのインデックスを更新するメソッドです。
     * @param {number} loadIndex ロードしたファイルのインデックス位置です
     * @param {number} saveMode ExtendSaveMode のいずれかを示すロード元のセーブモードです
     */
    updateSaveIndexByLoadIndex: function(loadIndex, mode) {
        if(root.getExternalData().env.MapSaveIndex === null || root.getExternalData().env.ChapterSaveIndex === null  || root.getExternalData().env.AutoSaveIndex == null) {
            this.initialize();
        }

        // --- CHAPTER セーブ ---
        if (mode === ExtendSaveMode.CHAPTER) {
            root.getExternalData().env.ChapterSaveIndex = loadIndex;
            this.setSaveMode(ExtendSaveMode.CHAPTER);
        }

        // --- MAP セーブ ---
        else if (mode === ExtendSaveMode.MAP) {
            root.getExternalData().env.MapSaveIndex = loadIndex;
            this.setSaveMode(ExtendSaveMode.MAP);
        }

        // --- AUTO セーブ ---
        else if (mode === ExtendSaveMode.AUTO) {
            root.getExternalData().env.AutoSaveIndex = loadIndex;
            this.setSaveMode(ExtendSaveMode.AUTO);
        }
    }
};