//
//  Entries.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

struct DebugEntries : Codable {
    public var entries: [Entry<String>]
}

class Entries: ObservableObject {
    @Published var entries : ServerData<DebugEntries> = .loading

    func load(context: Context) {
        dataLoad(path: "/debug", type: DebugEntries.self, context: context) {(result) in
            DispatchQueue.main.async {
                self.entries = result
            }
        }
    }
}
