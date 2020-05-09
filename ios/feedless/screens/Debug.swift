//
//  ContentView.swift
//  feedless
//
//  Created by Rogerio Chaves on 28/04/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct DebugEntries : Codable {
    public var entries: [Entry<String>]
}

class FetchEntries: ObservableObject {
    @Published var entries = [Entry<String>]()

    init() {
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

struct Debug: View {
    @State private var selection = 0

    @ObservedObject var fetch = FetchEntries()

    var body: some View {
        TabView(selection: $selection){
            VStack {
                List(fetch.entries, id: \.key) { post in
                    Text(post.value)
                }
            }
        }.accentColor(Color.purple)
    }
}

struct Debug_Previews: PreviewProvider {
    static var previews: some View {
        Debug()
    }
}
