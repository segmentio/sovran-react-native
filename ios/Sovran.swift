@objc(Sovran)
public class Sovran: RCTEventEmitter {

    @objc public static var emitter: RCTEventEmitter!

    @objc override init() {
        super.init()
        Sovran.emitter = self
    }

    @objc override public static func requiresMainQueueSetup() -> Bool {
        return true
    }

    @objc open override func supportedEvents() -> [String] {
        ["onStoreAction"]
    }

    @objc public static func dispatch(action: String, payload: Any!) -> Void {
        self.emitter.sendEvent(withName: "onStoreAction", body: [
            "type": action,
            "payload": payload
        ]);
    }
}

