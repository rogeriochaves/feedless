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
    @Published var entries = [Entry<String>]()

    func load() {
        let url = URL(string: "http://127.0.0.1:3000/debug")!

        URLSession.shared.dataTask(with: url) {(data, response, error) in
            do {
                if let todoData = data {
                    let decodedData = try JSONDecoder().decode(DebugEntries.self, from: todoData)
                    DispatchQueue.main.async {
                        self.entries = decodedData.entries
                    }
                } else {
                    print("No data loading debug")
                }
            } catch {
                print("Error loading debug entries")
            }
        }.resume()
    }
}
